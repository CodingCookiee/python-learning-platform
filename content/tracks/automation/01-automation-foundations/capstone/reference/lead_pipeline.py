"""Lead capture pipeline for Brightside Digital: form webhook -> validate -> enrich -> CRM -> Slack.

The bottom half of this file fakes the three services the pipeline talks to (a company enrichment
API, an Airtable-style CRM and Slack), and demo() sends the pipeline six form submissions, so
everything runs with no network and no keys:  uv run lead_pipeline.py
"""

import asyncio
import hashlib
import hmac
import json
import logging
import re
import time
from typing import Literal

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError, field_validator

log = logging.getLogger("lead_pipeline")

FREE_MAIL = {"gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"}
BUDGET_LABELS = {"under-5k": "under £5k", "5k-20k": "£5k to £20k", "over-20k": "over £20k"}
BUDGET_POINTS = {"over-20k": 30, "5k-20k": 20, "under-5k": 0, None: 0}
EMAIL_PATTERN = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
MAX_ATTEMPTS = 3
DEFAULT_WAIT = 30.0


class Settings(BaseModel):
    """Everything that differs between the demo, your tests and production (secrets come from env vars)."""

    webhook_secret: str
    slack_channel: str = "#new-leads"
    crm_base_id: str = "appBrightside"
    high_priority_score: int = 70
    tolerance_seconds: int = 300


class Lead(BaseModel):
    """One validated form submission."""

    submission_id: str
    name: str
    email: str
    company: str | None = None
    budget: Literal["under-5k", "5k-20k", "over-20k"] | None = None
    message: str | None = None
    consent: bool

    @field_validator("submission_id", "name")
    @classmethod
    def required_text(cls, value: str, info) -> str:
        value = value.strip()
        if not value:
            raise ValueError(f"{info.field_name} is required")
        return value

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(value):
            raise ValueError("enter an email address like name@example.com")
        return value

    @field_validator("company", "message")
    @classmethod
    def blank_is_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("consent")
    @classmethod
    def consent_given(cls, value: bool) -> bool:
        if not value:
            raise ValueError("consent is required")
        return value

    @property
    def domain(self) -> str:
        return self.email.rsplit("@", 1)[1]


class Company(BaseModel):
    """What the enrichment API knows about a company."""

    domain: str
    name: str
    employees: int
    industry: str


class InvalidWebhook(ValueError):
    """The webhook failed verification; the message says why."""


class SlackError(Exception):
    """Slack answered ok: false; the message is Slack's error code."""


class CrmError(Exception):
    """The CRM call failed after retries; the message says what happened."""


def slack_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def verify_webhook(secret: str, header: str, body: bytes, now: float, tolerance: int = 300) -> bool:
    """True, or raise InvalidWebhook: "malformed signature header", "timestamp outside tolerance"
    or "signature mismatch"."""
    timestamp, signatures = None, []
    for item in (header or "").split(","):
        key, _, value = item.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)
    try:
        timestamp = int(timestamp)
    except (TypeError, ValueError):
        raise InvalidWebhook("malformed signature header") from None
    if not signatures:
        raise InvalidWebhook("malformed signature header")
    if abs(now - timestamp) > tolerance:
        raise InvalidWebhook("timestamp outside tolerance")
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in signatures):
        raise InvalidWebhook("signature mismatch")
    return True


def score_lead(lead: Lead, company: Company | None) -> int:
    """0 to 100, by the rules in the brief."""
    score = 0
    if lead.domain not in FREE_MAIL:
        score += 30
    if company is not None:
        score += 20
        if company.employees >= 10:
            score += 20
    score += BUDGET_POINTS[lead.budget]
    return min(score, 100)


class LeadPipeline:
    """Everything after the webhook: enrich, score, upsert into the CRM, alert on Slack."""

    def __init__(self, settings: Settings, *, enrich: httpx.Client, crm: httpx.Client, slack: httpx.Client,
                 sleep=time.sleep):
        self.settings = settings
        self.enrich_client = enrich
        self.crm = crm
        self.slack = slack
        self.sleep = sleep

    def enrich(self, lead: Lead) -> Company | None:
        """The company behind the lead's email domain, or None (free mail, unknown, or the API failed)."""
        if lead.domain in FREE_MAIL:
            return None
        try:
            response = self.enrich_client.get("/v1/companies", params={"domain": lead.domain})
        except httpx.HTTPError as exc:
            log.warning("enrichment failed for %s: %s", lead.submission_id, type(exc).__name__)
            return None
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            log.warning("enrichment answered %s for %s", response.status_code, lead.submission_id)
            return None
        try:
            return Company.model_validate(response.json())
        except (ValueError, ValidationError):
            log.warning("enrichment sent an unexpected body for %s", lead.submission_id)
            return None

    def _crm_send(self, method: str, url: str, **kwargs) -> dict:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = self.crm.request(method, url, **kwargs)
            except httpx.TimeoutException:
                raise CrmError(f"CRM {method} timed out") from None
            except httpx.HTTPError as exc:
                raise CrmError(f"CRM {method} failed: {type(exc).__name__}") from None
            if response.status_code != 429 or attempt == MAX_ATTEMPTS:
                break
            self.sleep(float(response.headers.get("Retry-After", DEFAULT_WAIT)))
        if response.is_error:
            raise CrmError(f"CRM {method} answered {response.status_code}")
        return response.json()

    def upsert_contact(self, lead: Lead, score: int, company: Company | None) -> tuple[str, str]:
        """(record id, "created" | "updated"): exactly one CRM contact per email address."""
        table = f"/v0/{self.settings.crm_base_id}/Contacts"
        formula = "{Email}='" + lead.email.replace("'", "\\'") + "'"
        found = self._crm_send("GET", table, params={"filterByFormula": formula})["records"]
        values = {
            "Email": lead.email,
            "Name": lead.name,
            "Company": lead.company or (company.name if company else None),
            "Budget": BUDGET_LABELS.get(lead.budget) if lead.budget else None,
            "Employees": company.employees if company else None,
            "Score": score,
            "Source": "website form",
        }
        fields = {key: value for key, value in values.items() if value is not None and value != ""}
        if found:
            record = self._crm_send("PATCH", f"{table}/{found[0]['id']}", json={"fields": fields})
            return record["id"], "updated"
        record = self._crm_send("POST", table, json={"fields": fields})
        return record["id"], "created"

    def alert(self, lead: Lead, score: int, company: Company | None) -> bool:
        """Post the high-priority alert to Slack. True if Slack accepted it; never raises."""
        company_name = lead.company or (company.name if company else None)
        budget = BUDGET_LABELS[lead.budget] if lead.budget else "not given"
        who = slack_escape(lead.name) + (f" ({slack_escape(company_name)})" if company_name else "")
        text = f"New high-priority lead: {who}, score {score}, budget {budget}, {lead.email}"
        try:
            response = self.slack.post("/api/chat.postMessage", json={"channel": self.settings.slack_channel, "text": text})
            if response.is_error:
                raise SlackError(f"status {response.status_code}")
            data = response.json()
            if not data.get("ok"):
                raise SlackError(data.get("error", "unknown error"))
        except (httpx.HTTPError, SlackError, ValueError) as exc:
            log.warning("Slack alert failed for %s: %s", lead.submission_id, exc)
            return False
        return True

    def process(self, lead: Lead) -> dict:
        """Enrich, score, upsert, alert if high priority. Returns the lead's status record."""
        company = self.enrich(lead)
        score = score_lead(lead, company)
        try:
            crm_id, action = self.upsert_contact(lead, score, company)
        except CrmError as exc:
            log.error("CRM upsert failed for %s: %s", lead.submission_id, exc)
            return {"status": "failed", "error": str(exc)}
        alerted = False
        if score >= self.settings.high_priority_score:
            alerted = self.alert(lead, score, company)
        return {"status": "processed", "score": score, "crm_id": crm_id, "action": action, "alerted": alerted}


def create_app(settings: Settings, pipeline: LeadPipeline, *, clock=time.time) -> FastAPI:
    """POST /webhooks/leads and GET /leads/{submission_id}, as the brief describes."""
    app = FastAPI(title="Lead capture pipeline")
    leads: dict[str, dict] = {}  # submission_id -> status record (a database table in production)
    app.state.leads = leads

    def run(lead: Lead) -> None:
        try:
            record = pipeline.process(lead)
        except Exception as exc:  # noqa: BLE001 - a background task must record, not vanish
            log.exception("processing %s crashed", lead.submission_id)
            record = {"status": "failed", "error": f"unexpected error: {type(exc).__name__}"}
        leads[lead.submission_id] = {"submission_id": lead.submission_id, **record}

    @app.post("/webhooks/leads", status_code=202)
    async def lead_submitted(request: Request, background: BackgroundTasks):
        raw = await request.body()
        try:
            verify_webhook(settings.webhook_secret, request.headers.get("webhook-signature", ""), raw, clock(),
                           settings.tolerance_seconds)
        except InvalidWebhook as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from None
        try:
            data = json.loads(raw)
        except ValueError:
            raise HTTPException(status_code=400, detail="body is not valid JSON") from None
        try:
            lead = Lead.model_validate(data)
        except ValidationError as exc:
            detail = [{"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
                      for error in exc.errors()]
            return JSONResponse({"detail": detail}, status_code=422)
        if lead.submission_id in leads:
            return JSONResponse({"status": "duplicate", "submission_id": lead.submission_id}, status_code=200)
        leads[lead.submission_id] = {"submission_id": lead.submission_id, "status": "queued"}
        background.add_task(run, lead)
        return {"status": "queued", "submission_id": lead.submission_id}

    @app.get("/leads/{submission_id}")
    def lead_status(submission_id: str):
        if submission_id not in leads:
            raise HTTPException(status_code=404, detail="no such lead")
        return leads[submission_id]

    return app


# ---------------------------------------------------------------------------------------------
# Everything below is provided: fake services and a demo. Don't change how they behave.
# ---------------------------------------------------------------------------------------------

WEBHOOK_SECRET = "test-secret-brightside"  # a test value; the real one comes from the environment


class FakeEnrichment:
    """GET /v1/companies?domain=... -> a company, or 404. Counts lookups."""

    COMPANIES = {
        "haddadphysio.co.uk": {"domain": "haddadphysio.co.uk", "name": "Haddad Physio", "employees": 14, "industry": "Healthcare"},
        "okaforlogistics.com": {"domain": "okaforlogistics.com", "name": "Okafor Logistics", "employees": 240, "industry": "Logistics"},
    }

    def __init__(self):
        self.lookups = []

    def handle(self, request: httpx.Request) -> httpx.Response:
        if request.headers.get("authorization") != "Bearer test-enrich-key":
            return httpx.Response(401, json={"error": "missing or wrong API key"})
        domain = request.url.params.get("domain", "")
        self.lookups.append(domain)
        if domain not in self.COMPANIES:
            return httpx.Response(404, json={"error": "unknown domain"})
        return httpx.Response(200, json=self.COMPANIES[domain])


class FakeCrm:
    """An Airtable-style Contacts table: search with {Email}='...', POST to create, PATCH to update."""

    def __init__(self, records=None):
        self.records = {r["id"]: r for r in (records or [])}
        self.created = 0

    def handle(self, request: httpx.Request) -> httpx.Response:
        if request.headers.get("authorization") != "Bearer test-crm-token":
            return httpx.Response(401, json={"error": "AUTHENTICATION_REQUIRED"})
        path = request.url.path
        if not path.startswith("/v0/appBrightside/Contacts"):
            return httpx.Response(404, json={"error": "NOT_FOUND"})
        record_id = path.removeprefix("/v0/appBrightside/Contacts").strip("/")
        if request.method == "GET" and not record_id:
            match = re.fullmatch(r"\{Email\}='(.*)'", request.url.params.get("filterByFormula", ""))
            wanted = match.group(1).replace("\\'", "'") if match else None
            return httpx.Response(200, json={"records": [r for r in self.records.values() if r["fields"].get("Email") == wanted]})
        fields = json.loads(request.content)["fields"]
        if request.method == "POST" and not record_id:
            self.created += 1
            record = {"id": f"recNEW{self.created}", "fields": fields}
            self.records[record["id"]] = record
            return httpx.Response(200, json=record)
        if request.method == "PATCH" and record_id in self.records:
            self.records[record_id]["fields"].update(fields)
            return httpx.Response(200, json=self.records[record_id])
        return httpx.Response(404, json={"error": "NOT_FOUND"})


class FakeSlack:
    """POST /api/chat.postMessage. Answers ok: false for channels it doesn't know, like Slack."""

    def __init__(self, channels=("#new-leads",)):
        self.channels = set(channels)
        self.messages = []

    def handle(self, request: httpx.Request) -> httpx.Response:
        if request.headers.get("authorization") != "Bearer test-slack-token":
            return httpx.Response(200, json={"ok": False, "error": "not_authed"})
        body = json.loads(request.content)
        if body.get("channel") not in self.channels:
            return httpx.Response(200, json={"ok": False, "error": "channel_not_found"})
        self.messages.append(body)
        return httpx.Response(200, json={"ok": True, "channel": body["channel"], "ts": f"1773072000.{len(self.messages):06d}"})


def fake_clients(enrichment, crm, slack):
    """httpx clients wired to the fakes, configured the way make_clients would configure real ones."""
    def client(base_url, token, fake):
        return httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token}"},
                            timeout=httpx.Timeout(10.0, connect=5.0), transport=httpx.MockTransport(fake.handle))

    return (
        client("https://enrich.example", "test-enrich-key", enrichment),
        client("https://api.airtable.com", "test-crm-token", crm),
        client("https://slack.com", "test-slack-token", slack),
    )


def sign(body: bytes, timestamp: int, secret: str = WEBHOOK_SECRET) -> str:
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


def submission(submission_id, name, email, **extra):
    return {"submission_id": submission_id, "name": name, "email": email, "consent": True, **extra}


async def demo():
    now = 1773072000
    enrichment = FakeEnrichment()
    crm = FakeCrm([{"id": "recOLD1", "fields": {"Email": "nia@okaforlogistics.com", "Name": "Nia", "Phone": "+447700900789"}}])
    slack = FakeSlack()
    enrich_client, crm_client, slack_client = fake_clients(enrichment, crm, slack)
    settings = Settings(webhook_secret=WEBHOOK_SECRET)
    pipeline = LeadPipeline(settings, enrich=enrich_client, crm=crm_client, slack=slack_client)
    app = create_app(settings, pipeline, clock=lambda: now)

    amira = submission("sub_1042", " Amira Haddad ", "Amira@HaddadPhysio.co.uk", company="Haddad Physio",
                       budget="5k-20k", message="We need a new booking site before the summer.")
    deliveries = [
        ("sub_1042 Amira Haddad", amira, None),
        ("sub_1043 Tom Price", submission("sub_1043", "Tom Price", "tom.price@gmail.com", budget="5k-20k"), None),
        ("sub_1042 redelivered", amira, None),
        ("sub_1044 forged", submission("sub_1044", "Mallory", "m@example.com"), "wrong-secret"),
        ("sub_1045 no consent", {**submission("sub_1045", "Sam Lee", "sam@example.com"), "consent": False}, None),
        ("sub_1046 Nia Okafor", submission("sub_1046", "Nia Okafor", "nia@okaforlogistics.com", budget="over-20k"), None),
    ]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        for label, payload, secret in deliveries:
            body = json.dumps(payload).encode()
            headers = {"Content-Type": "application/json", "Webhook-Signature": sign(body, now, secret or WEBHOOK_SECRET)}
            response = await client.post("/webhooks/leads", content=body, headers=headers)
            data = response.json()
            if isinstance(data.get("detail"), list):
                outcome = data["detail"][0]["message"]
            else:
                outcome = data.get("status") or data.get("detail")
            print(f"POST {label:<24} {response.status_code} {outcome}")
        print()
        for submission_id in ("sub_1042", "sub_1043", "sub_1046"):
            lead = (await client.get(f"/leads/{submission_id}")).json()
            flag = "  alerted" if lead.get("alerted") else ""
            print(f"{submission_id}  {lead['status']}  score {lead.get('score', '-'):<3}  {lead.get('action')} {lead.get('crm_id')}{flag}")
    print()
    print(f"CRM contacts: {len(crm.records)} · Slack messages: {len(slack.messages)} · enrichment lookups: {len(enrichment.lookups)}")
    for message in slack.messages:
        print(f"{message['channel']}: {message['text']}")


if __name__ == "__main__":
    asyncio.run(demo())
