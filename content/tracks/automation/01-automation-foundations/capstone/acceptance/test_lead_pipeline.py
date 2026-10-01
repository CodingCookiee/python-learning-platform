"""Acceptance tests for the lead capture pipeline, run by GitHub Actions in your repository.

They import lead_pipeline.py from the top of your repository, wire your LeadPipeline to fresh
copies of the brief's fake services (over httpx.MockTransport, so nothing touches the network),
call your FastAPI app with a TestClient, and check what it answers and what the fakes recorded.
They also run `python lead_pipeline.py` and compare it with the sample run.
"""

import hashlib
import hmac
import importlib
import json
import logging
import os
import re
import subprocess
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

PROGRAM = Path("lead_pipeline.py")
NOW = 1773072000
SECRET = "acceptance-secret-7f3a"
TOKENS = {"enrich": "acc-enrich-key", "crm": "acc-crm-token", "slack": "acc-slack-token"}

SAMPLE = """\
POST sub_1042 Amira Haddad    202 queued
POST sub_1043 Tom Price       202 queued
POST sub_1042 redelivered     200 duplicate
POST sub_1044 forged          401 signature mismatch
POST sub_1045 no consent      422 Value error, consent is required
POST sub_1046 Nia Okafor      202 queued

sub_1042  processed  score 90   created recNEW1  alerted
sub_1043  processed  score 20   created recNEW2
sub_1046  processed  score 100  updated recOLD1  alerted

CRM contacts: 3 · Slack messages: 2 · enrichment lookups: 2
#new-leads: New high-priority lead: Amira Haddad (Haddad Physio), score 90, budget £5k to £20k, amira@haddadphysio.co.uk
#new-leads: New high-priority lead: Nia Okafor (Okafor Logistics), score 100, budget over £20k, nia@okaforlogistics.com"""


def module():
    assert PROGRAM.exists(), "lead_pipeline.py should be at the top of your repository"
    sys.modules.pop("lead_pipeline", None)
    try:
        return importlib.import_module("lead_pipeline")
    except Exception as exc:  # noqa: BLE001
        pytest.fail(f"Importing lead_pipeline.py failed ({type(exc).__name__}: {exc}). "
                    "It must import without a secret or any environment variable.")


# Fresh fakes of the three services, the same as the starter's (your copies can't change them)


class FakeEnrichment:
    COMPANIES = {
        "haddadphysio.co.uk": {"domain": "haddadphysio.co.uk", "name": "Haddad Physio", "employees": 14, "industry": "Healthcare"},
        "okaforlogistics.com": {"domain": "okaforlogistics.com", "name": "Okafor Logistics", "employees": 240, "industry": "Logistics"},
        "tinyco.io": {"domain": "tinyco.io", "name": "Tiny Co", "employees": 4, "industry": "Retail"},
    }

    def __init__(self, fail=None):
        self.lookups = []
        self.fail = fail  # None, an HTTP status, or "timeout"

    def handle(self, request):
        if request.headers.get("authorization") != f"Bearer {TOKENS['enrich']}":
            return httpx.Response(401, json={"error": "missing or wrong API key"})
        domain = request.url.params.get("domain", "")
        self.lookups.append(domain)
        if self.fail == "timeout":
            raise httpx.ReadTimeout("timed out", request=request)
        if self.fail:
            return httpx.Response(self.fail, json={"error": "upstream trouble"})
        if domain not in self.COMPANIES:
            return httpx.Response(404, json={"error": "unknown domain"})
        return httpx.Response(200, json=self.COMPANIES[domain])


class FakeCrm:
    def __init__(self, records=None, *, fail=None, throttle=0):
        self.records = {r["id"]: r for r in (records or [])}
        self.created = 0
        self.requests = []
        self.fail = fail  # None, an HTTP status, or "timeout"
        self.throttle = throttle  # answer 429 to this many requests first

    def handle(self, request):
        if request.headers.get("authorization") != f"Bearer {TOKENS['crm']}":
            return httpx.Response(401, json={"error": "AUTHENTICATION_REQUIRED"})
        body = json.loads(request.content) if request.content else None
        self.requests.append((request.method, request.url.path, dict(request.url.params), body))
        if self.throttle:
            self.throttle -= 1
            return httpx.Response(429, json={"error": "RATE_LIMITED"}, headers={"Retry-After": "1"})
        if self.fail == "timeout":
            raise httpx.ReadTimeout("timed out", request=request)
        if self.fail:
            return httpx.Response(self.fail, json={"error": "SERVER_ERROR"})
        path = request.url.path
        if not path.startswith("/v0/appBrightside/Contacts"):
            return httpx.Response(404, json={"error": "NOT_FOUND"})
        record_id = path.removeprefix("/v0/appBrightside/Contacts").strip("/")
        if request.method == "GET" and not record_id:
            match = re.fullmatch(r"\{Email\}='(.*)'", request.url.params.get("filterByFormula", ""))
            wanted = match.group(1).replace("\\'", "'") if match else None
            return httpx.Response(200, json={"records": [r for r in self.records.values() if r["fields"].get("Email") == wanted]})
        fields = body["fields"]
        if request.method == "POST" and not record_id:
            self.created += 1
            record = {"id": f"recNEW{self.created}", "fields": fields}
            self.records[record["id"]] = record
            return httpx.Response(200, json=record)
        if request.method == "PATCH" and record_id in self.records:
            self.records[record_id]["fields"].update(fields)
            return httpx.Response(200, json=self.records[record_id])
        return httpx.Response(404, json={"error": "NOT_FOUND"})

    def writes(self):
        return [r for r in self.requests if r[0] in ("POST", "PATCH")]


class FakeSlack:
    def __init__(self, channels=("#new-leads",)):
        self.channels = set(channels)
        self.messages = []

    def handle(self, request):
        if request.headers.get("authorization") != f"Bearer {TOKENS['slack']}":
            return httpx.Response(200, json={"ok": False, "error": "not_authed"})
        body = json.loads(request.content)
        if body.get("channel") not in self.channels:
            return httpx.Response(200, json={"ok": False, "error": "channel_not_found"})
        self.messages.append(body)
        return httpx.Response(200, json={"ok": True, "channel": body["channel"], "ts": f"{NOW}.{len(self.messages):06d}"})


class Rig:
    """Your app and pipeline, wired to fresh fakes."""

    def __init__(self, *, enrichment=None, crm=None, slack=None):
        lp = module()
        self.enrichment = enrichment or FakeEnrichment()
        self.crm = crm or FakeCrm()
        self.slack = slack or FakeSlack()
        self.sleeps = []

        def client(base_url, token, fake):
            return httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token}"},
                                timeout=httpx.Timeout(10.0, connect=5.0), transport=httpx.MockTransport(fake.handle))

        self.settings = lp.Settings(webhook_secret=SECRET)
        self.pipeline = lp.LeadPipeline(
            self.settings,
            enrich=client("https://enrich.example", TOKENS["enrich"], self.enrichment),
            crm=client("https://api.airtable.com", TOKENS["crm"], self.crm),
            slack=client("https://slack.com", TOKENS["slack"], self.slack),
            sleep=self.sleeps.append,
        )
        self.app = lp.create_app(self.settings, self.pipeline, clock=lambda: NOW)
        self.http = TestClient(self.app, raise_server_exceptions=False)

    @property
    def leads(self):
        return self.app.state.leads

    def post(self, payload, *, timestamp=NOW, secret=SECRET, header=None, raw=None):
        body = raw if raw is not None else json.dumps(payload).encode()
        headers = {"Content-Type": "application/json"}
        if header is None:
            header = sign(body, timestamp, secret)
        if header is not False:
            headers["Webhook-Signature"] = header
        return self.http.post("/webhooks/leads", content=body, headers=headers)

    def submit(self, payload):
        """Post a valid lead and return its stored status record."""
        response = self.post(payload)
        assert response.status_code == 202, (
            f"A new, correctly signed lead should get 202, got {response.status_code}: {response.text[:300]}")
        status = self.http.get(f"/leads/{payload['submission_id']}")
        assert status.status_code == 200, f"GET /leads/{payload['submission_id']} should find the lead, got {status.status_code}"
        return status.json()


def sign(body, timestamp, secret=SECRET):
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


def submission(submission_id, name, email, **extra):
    return {"submission_id": submission_id, "name": name, "email": email, "consent": True, **extra}


# The demo


def test_demo_prints_the_sample_run():
    assert PROGRAM.exists(), "lead_pipeline.py should be at the top of your repository"
    result = subprocess.run([sys.executable, str(PROGRAM)], capture_output=True, text=True, encoding="utf-8",
                            timeout=60, env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    assert result.returncode == 0, f"python lead_pipeline.py crashed:\n{result.stderr[-1500:]}"
    lines = [line.rstrip() for line in result.stdout.strip().splitlines()]
    assert lines == SAMPLE.splitlines(), (
        "python lead_pipeline.py should print exactly the sample run in the brief. It printed:\n" + result.stdout)


# The webhook


def test_verify_webhook_names_each_failure():
    lp = module()
    body = b'{"submission_id": "s1"}'
    assert lp.verify_webhook(SECRET, sign(body, NOW), body, NOW) is True, "A correct signature should verify"
    assert lp.verify_webhook(SECRET, sign(body, NOW - 300), body, NOW) is True, "300 seconds old is still within tolerance"
    cases = [
        ("", "malformed signature header"),
        ("t=soon,v1=abc", "malformed signature header"),
        (f"t={NOW}", "malformed signature header"),
        (sign(body, NOW - 301), "timestamp outside tolerance"),
        (sign(body, NOW, "another-secret"), "signature mismatch"),
        (sign(body + b" ", NOW), "signature mismatch"),
    ]
    for header, reason in cases:
        with pytest.raises(lp.InvalidWebhook) as caught:
            lp.verify_webhook(SECRET, header, body, NOW)
        assert str(caught.value) == reason, f"verify_webhook with header {header!r} should raise InvalidWebhook({reason!r}), got {caught.value!r}"


def test_bad_signatures_get_401_and_nothing_is_stored():
    rig = Rig()
    lead = submission("sub_2001", "Tom Price", "tom@example.com")
    attempts = [
        (rig.post(lead, header=False), "malformed signature header", "no Webhook-Signature header"),
        (rig.post(lead, secret="another-secret"), "signature mismatch", "a signature made with another secret"),
        (rig.post(lead, timestamp=NOW - 301), "timestamp outside tolerance", "a signature from 301 seconds ago"),
    ]
    for response, reason, what in attempts:
        assert response.status_code == 401, f"A request with {what} should get 401, got {response.status_code}"
        assert response.json().get("detail") == reason, f"A request with {what} should answer {{'detail': {reason!r}}}, got {response.json()}"
    assert rig.leads == {}, f"Nothing should be stored for requests that fail the signature check, but app.state.leads is {rig.leads}"
    assert rig.crm.requests == [] and rig.enrichment.lookups == [], "A request that fails the signature check must not reach any service"


def test_signed_body_that_isnt_json_gets_400():
    rig = Rig()
    response = rig.post(None, raw=b"name=Tom&email=tom@example.com")
    assert response.status_code == 400, f"A correctly signed body that isn't JSON should get 400, got {response.status_code}"
    assert rig.leads == {}, "Nothing should be stored for a body that isn't JSON"


def test_invalid_lead_gets_422_with_field_messages():
    rig = Rig()
    response = rig.post({"submission_id": "s", "name": "   ", "email": "not-an-email", "consent": True})
    assert response.status_code == 422, f"A lead with a blank name and a bad email should get 422, got {response.status_code}"
    detail = response.json().get("detail")
    assert isinstance(detail, list) and all(isinstance(d, dict) and {"field", "message"} <= d.keys() for d in detail), (
        f'422 should answer {{"detail": [{{"field": ..., "message": ...}}, ...]}}, got {response.json()}')
    assert sorted(d["field"] for d in detail) == ["email", "name"], (
        f"detail should have one entry for name and one for email, got {detail}")

    response = rig.post({**submission("s2", "Sam Lee", "sam@example.com"), "consent": False})
    assert response.status_code == 422, f"A lead without consent should get 422, got {response.status_code}"
    detail = response.json()["detail"]
    assert [d["field"] for d in detail] == ["consent"] and "consent is required" in detail[0]["message"], (
        f"A lead without consent should get one consent entry saying 'consent is required', got {detail}")
    assert rig.leads == {} and rig.crm.requests == [], "Nothing should be stored or sent to the CRM for an invalid lead"


def test_lead_model_cleans_and_checks_each_field():
    lp = module()
    lead = lp.Lead(submission_id=" sub_9 ", name="  Amira Haddad ", email=" Amira@HaddadPhysio.co.uk ",
                   company="   ", message="", budget="5k-20k", consent=True)
    assert lead.submission_id == "sub_9", f"submission_id should be stripped, got {lead.submission_id!r}"
    assert lead.name == "Amira Haddad", f"name should be stripped, got {lead.name!r}"
    assert lead.email == "amira@haddadphysio.co.uk", f"email should be stripped and lower-cased, got {lead.email!r}"
    assert lead.company is None and lead.message is None, "A blank company or message should become None"
    assert lp.Lead(submission_id="s", name="N", email="n@x.io", consent=True).budget is None, "budget can be missing"
    bad = [
        {"submission_id": "  "},
        {"email": "two@@example.com"},
        {"email": "no spaces@example.com"},
        {"email": "nodot@example"},
        {"budget": "about-10k"},
        {"consent": False},
    ]
    for change in bad:
        try:
            lp.Lead(**{**dict(submission_id="s", name="N", email="n@x.io", consent=True), **change})
        except ValidationError:
            continue
        pytest.fail(f"Lead should refuse {change} with a ValidationError, but accepted it")


def test_new_lead_is_queued_and_a_redelivery_is_a_duplicate():
    rig = Rig()
    lead = submission("sub_3001", "Tom Price", "tom@example.com")
    first, second = rig.post(lead), rig.post(lead)
    assert first.status_code == 202 and first.json() == {"status": "queued", "submission_id": "sub_3001"}, (
        f'A new lead should get 202 {{"status": "queued", "submission_id": "sub_3001"}}, got {first.status_code} {first.text}')
    assert second.status_code == 200 and second.json() == {"status": "duplicate", "submission_id": "sub_3001"}, (
        f'A redelivered submission_id should get 200 {{"status": "duplicate", ...}}, got {second.status_code} {second.text}')
    assert len(rig.crm.writes()) == 1, f"A redelivery must not be processed again: the CRM got {len(rig.crm.writes())} writes"
    record = rig.http.get("/leads/sub_3001").json()
    assert record.get("status") == "processed" and record.get("action") == "created" and record.get("crm_id") == "recNEW1", (
        f"GET /leads/sub_3001 should return the processed status record (status, score, crm_id, action, alerted), got {record}")
    assert rig.http.get("/leads/sub_nope").status_code == 404, "GET /leads/<unknown id> should answer 404"


def test_score_follows_the_table():
    lp = module()

    def lead(email, budget=None):
        return lp.Lead(submission_id="s", name="N", email=email, budget=budget, consent=True)

    def company(employees):
        return lp.Company(domain="x.io", name="X", employees=employees, industry="Retail")

    cases = [
        (lead("tom@gmail.com"), None, 0),
        (lead("tom@gmail.com", "5k-20k"), None, 20),
        (lead("ana@unknown.io", "under-5k"), None, 30),
        (lead("ana@tinyco.io", "5k-20k"), company(4), 70),
        (lead("ana@acme.io"), company(10), 70),
        (lead("ana@acme.io", "over-20k"), company(240), 100),
    ]
    for the_lead, the_company, expected in cases:
        got = lp.score_lead(the_lead, the_company)
        assert got == expected, (f"score_lead for {the_lead.email}, budget {the_lead.budget}, "
                                 f"company {the_company and the_company.employees} employees should be {expected}, got {got}")


def test_enrichment_is_skipped_for_free_mail_and_never_loses_a_lead(caplog):
    rig = Rig()
    rig.submit(submission("sub_4001", "Tom Price", "Tom.Price@GMAIL.com"))
    assert rig.enrichment.lookups == [], f"Free-mail addresses must not be looked up, but the enrichment API got {rig.enrichment.lookups}"
    record = rig.submit(submission("sub_4002", "Ana Ruiz", "ana@unknown-domain.io", budget="under-5k"))
    assert rig.enrichment.lookups == ["unknown-domain.io"], f"A business domain should be looked up once, got {rig.enrichment.lookups}"
    assert record.get("status") == "processed" and record.get("score") == 30, f"A 404 from enrichment means no company: expected processed with score 30, got {record}"

    for fail in (500, "timeout"):
        caplog.clear()
        rig = Rig(enrichment=FakeEnrichment(fail=fail))
        with caplog.at_level(logging.WARNING):
            record = rig.submit(submission("sub_4003", "Amira Haddad", "amira@haddadphysio.co.uk", budget="5k-20k"))
        what = "a timeout" if fail == "timeout" else f"a {fail}"
        assert record.get("status") == "processed" and record.get("score") == 50, (
            f"With {what} from enrichment the lead should still be processed with no company (score 50), got {record}")
        assert any(r.levelno >= logging.WARNING for r in caplog.records), f"{what.capitalize()} from enrichment should log a warning"


def test_crm_upsert_updates_the_existing_contact_without_blanking_fields():
    existing = {"id": "recOLD1", "fields": {"Email": "o'brien@example.com", "Name": "Pat", "Company": "Typed by sales", "Phone": "+447700900789"}}
    rig = Rig(crm=FakeCrm([existing]))
    record = rig.submit(submission("sub_5001", "Pat O'Brien", "O'Brien@Example.com"))
    assert (record.get("action"), record.get("crm_id")) == ("updated", "recOLD1"), (
        f"A lead whose email is already in the CRM (search with the ' escaped) should update that record, got {record}")
    assert len(rig.crm.records) == 1, "There should still be exactly one contact for the email"
    _, _, _, body = rig.crm.writes()[0]
    fields = body["fields"]
    assert all(value not in (None, "") for value in fields.values()), f"Leave out fields you have no value for, but the CRM got {fields}"
    assert "Company" not in fields and "Budget" not in fields and "Employees" not in fields, (
        f"This lead has no company, budget or enrichment, so those fields should be left out, got {fields}")
    assert fields.get("Email") == "o'brien@example.com" and fields.get("Name") == "Pat O'Brien" and fields.get("Source") == "website form", (
        f"The CRM fields should include Email (lower-cased), Name and Source 'website form', got {fields}")
    kept = rig.crm.records["recOLD1"]["fields"]
    assert kept.get("Phone") == "+447700900789" and kept.get("Company") == "Typed by sales", f"The update blanked what sales typed: {kept}"

    rig = Rig()
    rig.submit(submission("sub_5002", "Nia Okafor", "nia@okaforlogistics.com", budget="over-20k"))
    fields = rig.crm.writes()[0][3]["fields"]
    expected = {"Email": "nia@okaforlogistics.com", "Name": "Nia Okafor", "Company": "Okafor Logistics",
                "Budget": "over £20k", "Employees": 240, "Score": 100, "Source": "website form"}
    assert fields == expected, f"A new contact's fields should be {expected}, got {fields}"


def test_crm_429_is_retried_with_the_injected_sleep():
    rig = Rig(crm=FakeCrm(throttle=2))
    record = rig.submit(submission("sub_6001", "Tom Price", "tom@example.com"))
    assert record.get("status") == "processed", f"Two 429s then success should still process the lead, got {record}"
    assert len(rig.sleeps) == 2, f"Each 429 should wait with the injected sleep before retrying: it was called {len(rig.sleeps)} times"


def test_crm_failure_marks_the_lead_failed(caplog):
    for fail in (500, "timeout", 429):
        rig = Rig(crm=FakeCrm(fail=fail, throttle=99 if fail == 429 else 0))
        caplog.clear()
        with caplog.at_level(logging.ERROR):
            response = rig.post(submission("sub_7001", "Tom Price", "tom@example.com"))
        what = {500: "a CRM that answers 500", "timeout": "a CRM that times out", 429: "a CRM that answers 429 every time"}[fail]
        assert response.status_code == 202, f"With {what}, the webhook should still answer 202 (the work happens later), got {response.status_code}"
        record = rig.http.get("/leads/sub_7001").json()
        assert record.get("status") == "failed" and record.get("error"), (
            f'With {what}, the lead should be stored as {{"status": "failed", "error": "<what happened>"}}, got {record}')
        assert any(r.levelno >= logging.ERROR for r in caplog.records), f"With {what}, a failed lead should log an error"
        if fail == 429:
            gets = [r for r in rig.crm.requests if r[0] == "GET"]
            assert len(gets) == 3, f"A 429 should be retried up to three attempts in all, the CRM got {len(gets)}"
        assert rig.slack.messages == [], "A lead that didn't reach the CRM shouldn't be announced on Slack"


def test_only_high_priority_leads_reach_slack_escaped():
    rig = Rig()
    record = rig.submit(submission("sub_8001", "Amira <b>", "amira@haddadphysio.co.uk", company="<!channel> & Co", budget="5k-20k"))
    assert record.get("alerted") is True, f"A lead scoring 90 should be alerted, got {record}"
    assert len(rig.slack.messages) == 1 and rig.slack.messages[0]["channel"] == "#new-leads", (
        f"One message should go to #new-leads, got {rig.slack.messages}")
    expected = ("New high-priority lead: Amira &lt;b&gt; (&lt;!channel&gt; &amp; Co), score 90, "
                "budget £5k to £20k, amira@haddadphysio.co.uk")
    assert rig.slack.messages[0]["text"] == expected, f"The Slack text should be\n{expected}\ngot\n{rig.slack.messages[0]['text']}"

    record = rig.submit(submission("sub_8002", "Ana Ruiz", "ana@okaforlogistics.com"))
    assert record.get("score") == 70 and record.get("alerted") is True, f"A score of exactly 70 is high priority, got {record}"
    assert rig.slack.messages[-1]["text"] == ("New high-priority lead: Ana Ruiz (Okafor Logistics), score 70, budget not given, "
                                              "ana@okaforlogistics.com"), f"Unexpected Slack text: {rig.slack.messages[-1]['text']}"

    record = rig.submit(submission("sub_8003", "Tom Price", "tom@gmail.com", budget="5k-20k"))
    assert record.get("alerted") is False and len(rig.slack.messages) == 2, f"A lead scoring 20 must not reach Slack, got {record}"


def test_slack_failure_is_alerted_false_not_a_crash(caplog):
    rig = Rig(slack=FakeSlack(channels=("#sales",)))
    with caplog.at_level(logging.WARNING):
        record = rig.submit(submission("sub_9001", "Nia Okafor", "nia@okaforlogistics.com", budget="over-20k"))
    assert record.get("status") == "processed" and record.get("alerted") is False, (
        f"When Slack answers ok: false the lead is still processed, with alerted false, got {record}")
    assert any(r.levelno >= logging.WARNING for r in caplog.records), "A Slack failure should log a warning"


def test_secrets_never_reach_the_logs(caplog):
    with caplog.at_level(logging.DEBUG):
        rig = Rig(enrichment=FakeEnrichment(fail="timeout"), crm=FakeCrm(fail=500), slack=FakeSlack(channels=()))
        rig.post(submission("sub_10001", "Tom Price", "tom@example.com"), secret="another-secret")
        rig.post(submission("sub_10002", "Amira Haddad", "amira@haddadphysio.co.uk", budget="over-20k"))
        rig = Rig(slack=FakeSlack(channels=()))
        rig.post(submission("sub_10003", "Amira Haddad", "amira@haddadphysio.co.uk", budget="over-20k"))
    text = caplog.text + "\n".join(str(r.args) for r in caplog.records)
    for name, secret in [("the webhook secret", SECRET), *[(f"the {k} token", v) for k, v in TOKENS.items()]]:
        assert secret not in text, f"{name.capitalize()} appeared in a log record. Never log secrets, tokens or headers."
