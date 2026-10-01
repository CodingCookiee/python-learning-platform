Brightside Digital is a twelve-person marketing agency. Its website's contact form emails a shared
inbox, and someone copies each enquiry into the CRM (an Airtable base), looks the company up, and
pings the right person on Slack if it looks promising. On a good day that takes an hour; on a busy
one, a £20k enquiry sits unread until the next morning, and last month two went to a competitor
who called back first.

They want the whole flow automated: **form webhook → validate → enrich → CRM → Slack alert**. Half
the team wants "a proper service", the other half has heard about n8n. So you'll build it **twice**:
once as a tested FastAPI service in Python, and once as an n8n workflow on your machine. Then you'll
tell them which one to run, and why. That write-up is part of the job: it's the conversation you'll
have with every client from A8 on.

This capstone uses the whole module: the four parts of an automation (lesson 1), signed and
idempotent webhooks with fast acknowledgement (lesson 4), SaaS integrations with timeouts,
escaping and upserts (lesson 5), and n8n (lesson 7). It builds on the FastAPI service from
module 15 and the API client from module 14.

## A sample run

`starter.py` (save it as `lead_pipeline.py`) contains fakes of the three services and a `demo()`
that sends the pipeline six deliveries from the form tool. When your half of the file is done:

```text
$ uv run lead_pipeline.py
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
#new-leads: New high-priority lead: Nia Okafor (Okafor Logistics), score 100, budget over £20k, nia@okaforlogistics.com
```

Read it as a checklist: a redelivery is recognised, a forged request and a lead without consent
are turned away at the door, Tom's Gmail address isn't sent to the enrichment API, Nia was already
in the CRM (and keeps the phone number the sales team added), and only the two high-priority leads
reach Slack.

## The design

| Piece | Job |
|-------|-----|
| `Settings` | the secret, Slack channel, CRM base and thresholds (provided) |
| `Lead` | a Pydantic model: the validated submission |
| `verify_webhook` | the signature check from lesson 4 |
| `score_lead` | a pure function: lead and company in, 0–100 out |
| `LeadPipeline` | the background work: `enrich`, `upsert_contact`, `alert`, and `process` to run them in order |
| `create_app` | the FastAPI app: `POST /webhooks/leads` and `GET /leads/{submission_id}` |

`LeadPipeline` takes three `httpx.Client`s (enrichment, CRM, Slack) with their base URL, auth
header and timeout already set, so it never knows whether it's talking to the fakes or the real
services. `create_app` takes the pipeline and a `clock`, so tests control both.

## Part 1: the Python service

### The webhook

The form tool sends `POST /webhooks/leads` with a JSON body and a `Webhook-Signature` header,
`t=<unix seconds>,v1=<hex>`, where the signature is HMAC-SHA256 with `settings.webhook_secret` over
`f"{t}."` followed by the raw body (exactly lesson 4's scheme). The endpoint checks, in this order:

| Check | Answer |
|-------|--------|
| signature missing, malformed, outside `settings.tolerance_seconds` of `clock()`, or wrong | `401`, `{"detail": "<reason>"}` with lesson 4's messages |
| body isn't valid JSON | `400` |
| body doesn't validate as a `Lead` | `422`, `{"detail": [{"field": "email", "message": "..."}, ...]}` |
| `submission_id` already received (whatever its status) | `200`, `{"status": "duplicate", "submission_id": ...}` |
| otherwise | `202`, `{"status": "queued", "submission_id": ...}`, and the lead is processed in a `BackgroundTasks` task |

Store each lead's status record in the `leads` dict that `create_app` sets up: `queued` straight
away, then the pipeline's result. Nothing is stored for a request that fails a check.

### Validation

A submission looks like this:

```json
{
  "submission_id": "sub_1042",
  "name": " Amira Haddad ",
  "email": "Amira@HaddadPhysio.co.uk",
  "company": "Haddad Physio",
  "budget": "5k-20k",
  "message": "We need a new booking site before the summer.",
  "consent": true
}
```

Add validators to `Lead` so that:

- `submission_id` and `name` are stripped, and blank ones are refused;
- `email` is stripped and lower-cased, and must look like `something@domain.tld` (no spaces, one
  `@`, a dot in the domain);
- blank `company` and `message` become `None`;
- `budget` is one of `under-5k`, `5k-20k`, `over-20k`, or missing;
- `consent` must be `true`, with the message `consent is required`. The agency may only contact
  people who agreed to it; a lead without consent never reaches the CRM.

### Enrichment

`GET /v1/companies?domain=<the email's domain>` on the enrichment client returns
`{"domain", "name", "employees", "industry"}`, or `404` for a domain it doesn't know. Don't look up
free-mail domains (the `FREE_MAIL` set): it wastes a paid lookup and sends a private person's
address to a third party. A `404`, any error status or a timeout all mean "no company": log a
warning for errors and timeouts, and carry on. Enrichment is nice to have, never a reason to lose
a lead.

### Scoring

| Rule | Points |
|------|--------|
| the email's domain isn't free mail | 30 |
| the enrichment API knows the company | 20 |
| it has at least 10 employees | 20 |
| budget `over-20k` / `5k-20k` / `under-5k` or none | 30 / 20 / 0 |

The score is capped at 100. A lead is **high priority** when its score is at least
`settings.high_priority_score` (70).

### The CRM

Upsert into the `Contacts` table of `settings.crm_base_id` exactly as in lesson 5's stretch drill:
search with `filterByFormula={Email}='<email>'` (escaping `'`), then `PATCH` the record found or
`POST` a new one, retrying a `429` up to three attempts with the injected `sleep`. The fields are:

| Field | Value |
|-------|-------|
| `Email`, `Name` | from the lead |
| `Company` | the lead's company, or the enrichment's name |
| `Budget` | the label from `BUDGET_LABELS` |
| `Employees` | from the enrichment |
| `Score` | the score |
| `Source` | `"website form"` |

Leave out any field you have no value for, so an update never blanks what the sales team typed.

### Slack

For high-priority leads only, post to `settings.slack_channel` via `POST /api/chat.postMessage`:

```text
New high-priority lead: <name> (<company>), score <score>, budget <label or "not given">, <email>
```

leaving out ` (<company>)` when there's none, and escaping the name and company. Slack reports
errors in the body (`"ok": false`); treat those, error statuses and timeouts the same way: log a
warning and record `alerted: false`. A lead that reached the CRM is a success even if Slack is down.

### Status and failures

`process(lead)` returns the status record
`{"status": "processed", "score", "crm_id", "action": "created" | "updated", "alerted"}`, which the
background task stores with the `submission_id`. If the CRM call fails (an error status after
retries, or a timeout), store `{"status": "failed", "error": "<what happened>"}` instead and log
an error: the form tool already got its `202`, so a failed lead is now yours to retry, and it must
be visible. `GET /leads/{submission_id}` returns the record, or `404`.

Never log the webhook secret, a token or a whole request body.

### Wiring it for real

The demo uses fakes. For production, build the three clients from environment variables:

```python
import os

def make_clients():
    def client(base_url, token):
        return httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token}"},
                            timeout=httpx.Timeout(10.0, connect=5.0))
    return (
        client("https://enrich.example", os.environ["ENRICH_API_KEY"]),
        client("https://api.airtable.com", os.environ["AIRTABLE_TOKEN"]),
        client("https://slack.com", os.environ["SLACK_BOT_TOKEN"]),
    )
```

Put that wiring, and `app = create_app(Settings(webhook_secret=os.environ["FORMS_WEBHOOK_SECRET"]), pipeline)`,
in a separate `main.py` for `uv run fastapi run main.py` to find, so that importing
`lead_pipeline.py` (in tests, in the demo, in the browser) never needs a secret.

## Testing it in the browser

FastAPI, Pydantic and httpx all load in the browser, so the whole service can be tested there,
with no network. Write your tests as plain `async def test_...` functions that build fresh fakes
from the bottom of the file, call the app through `httpx.ASGITransport`, and assert on the
responses and on what the fakes recorded:

```python
async def test_redelivery_is_a_duplicate():
    enrichment, crm, slack = FakeEnrichment(), FakeCrm(), FakeSlack()
    enrich_client, crm_client, slack_client = fake_clients(enrichment, crm, slack)
    settings = Settings(webhook_secret=WEBHOOK_SECRET)
    pipeline = LeadPipeline(settings, enrich=enrich_client, crm=crm_client, slack=slack_client, sleep=lambda s: None)
    app = create_app(settings, pipeline, clock=lambda: 1773072000)
    body = json.dumps(submission("sub_2001", "Tom Price", "tom@example.com")).encode()
    headers = {"Content-Type": "application/json", "Webhook-Signature": sign(body, 1773072000)}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        first = await client.post("/webhooks/leads", content=body, headers=headers)
        second = await client.post("/webhooks/leads", content=body, headers=headers)
    assert (first.status_code, second.status_code) == (202, 200)
    assert len(crm.records) == 1
```

Paste the file and your tests into any pylearn code block and run them all with a top-level
`await`:

```python
for name, check in list(globals().items()):
    if name.startswith("test_"):
        await check()
        print("passed", name)
```

On your machine the same functions run under pytest (`uv add --dev pytest anyio`, then mark them
with `@pytest.mark.anyio`). For a service that misbehaves in ways the fakes don't, subclass them:
a `FakeSlack` whose `handle` raises `httpx.ReadTimeout`, a `FakeCrm` that answers `429` twice.

## Part 2: the same flow in n8n

Now build it again as an n8n workflow, running on your machine as in lesson 7. So that n8n has
something to call, serve the same three fakes over real HTTP with this small app next to
`lead_pipeline.py`:

```python
# lab_services.py: uv run fastapi dev lab_services.py --port 8001
import httpx
from fastapi import FastAPI, Request, Response

from lead_pipeline import FakeCrm, FakeEnrichment, FakeSlack

fakes = {
    "enrich": FakeEnrichment(),
    "crm": FakeCrm([{"id": "recOLD1", "fields": {"Email": "nia@okaforlogistics.com", "Name": "Nia", "Phone": "+447700900789"}}]),
    "slack": FakeSlack(),
}
app = FastAPI()

@app.get("/state")
def state():
    return {"crm_contacts": len(fakes["crm"].records), "slack_messages": fakes["slack"].messages,
            "enrichment_lookups": fakes["enrich"].lookups}

@app.api_route("/{service}/{path:path}", methods=["GET", "POST", "PATCH"])
async def forward(service: str, path: str, request: Request):
    upstream = httpx.Request(request.method, f"http://fake/{path}?{request.url.query}",
                             headers=request.headers, content=await request.body())
    reply = fakes[service].handle(upstream)
    print(f"{service}: {request.method} /{path} -> {reply.status_code}")
    return Response(reply.content, status_code=reply.status_code, media_type="application/json")
```

From inside the n8n container, the fakes are at `http://host.docker.internal:8001/enrich/v1/companies`,
`.../crm/v0/appBrightside/Contacts` and `.../slack/api/chat.postMessage`. Store the three tokens
from `fake_clients` (`test-enrich-key`, `test-crm-token`, `test-slack-token`) as n8n **Header Auth**
credentials (`Authorization: Bearer ...`), never in node parameters.

Do it on your machine:

1. **Trigger.** A Webhook node, `POST`, path `brightside-leads`, protected by a Header Auth
   credential: the form tool must send `X-Form-Secret: <a long random value>`. (n8n's Webhook node
   can't check an HMAC over the raw body without extra work. Note this difference for your write-up:
   a shared header travels with every request and doesn't stop replays.)
2. **Validate.** A Code node that applies the `Lead` rules to `$json.body` and outputs one clean
   item per valid lead, with invalid ones dropped (or routed to a "rejected" branch with the reason).
3. **Deduplicate.** A Remove Duplicates node keyed on `submission_id`, set to drop items seen in
   previous executions (recent n8n versions have this option; on older ones, check the CRM for the
   submission id instead).
4. **Enrich.** An IF node that skips free-mail domains, then an HTTP Request node for the company,
   with its error setting on "continue", so a `404` or a timeout doesn't stop the lead.
5. **Score.** A Code node with the scoring table from Part 1.
6. **Upsert.** An HTTP Request node that searches the CRM with the `filterByFormula` expression, an
   IF node on whether a record came back, and a `PATCH` or `POST` node for each branch, sending only
   the fields that have values. Turn on Retry On Fail.
7. **Alert.** An IF node on the score, then an HTTP Request node posting the Slack text from Part 1
   to `#new-leads`.
8. **Verify it by webhook.** Activate the workflow and send the six sample deliveries to its
   production URL with a small script that reuses `submission()` from `lead_pipeline.py` and your
   `X-Form-Secret` header instead of the signature (the forged delivery sends a wrong secret). Then
   open `http://localhost:8001/state`: it should show 3 CRM contacts, the same 2 Slack messages as the
   Python run, and 2 enrichment lookups. The `lab_services` terminal shows every call n8n made.
9. Export the workflow as `lead-intake.n8n.json` and check it contains no tokens or secrets.

## Try these

Before you submit, check each of these with a test:

- A request with no signature header, one signed with another secret, and one signed 301 seconds
  before `clock()` all get `401`, and none of them appear in `app.state.leads`.
- `{"submission_id": "s", "name": "   ", "email": "not-an-email", "consent": true}` gets `422` with
  two entries in `detail`, one for `name` and one for `email`.
- A lead at `@gmail.com` makes no enrichment request; a lead at an unknown company domain makes
  one, gets a `404`, and is still processed.
- With a `FakeSlack` whose only channel is `#sales`, a high-priority lead is `processed` with
  `alerted: false`, and a warning is logged.
- With a `FakeCrm` that answers `500` to everything, the lead's status is `failed`, its `error` says
  why, and the webhook itself still answered `202`.
- A company name of `<!channel> & Co` reaches Slack as `&lt;!channel&gt; &amp; Co`.
- Capture every log record at `DEBUG` while `demo()` runs: the webhook secret and the three tokens
  appear in none of them.

## Stretch goals

- **A durable queue.** Replace `BackgroundTasks` with a SQLite table of pending leads (module 16)
  and a worker function that takes a batch, processes it and marks each row done or failed, so a
  restart loses nothing. Add `POST /leads/{submission_id}/retry` for failed leads.
- **Real form payloads.** Accept Tally's question-list format too, reusing `flatten_submission` from
  lesson 7, chosen by a query parameter on the webhook URL.
- **HMAC in n8n.** Switch the Webhook node to raw body and forward the body and signature to a
  `POST /verify` endpoint on your service, so the n8n build checks signatures as strictly as the
  Python one.
- **A daily digest.** A GitHub Actions workflow (lesson 3) that posts yesterday's lead count and the
  failed leads to Slack every weekday at 08:30 London time, whatever the season.
- **Ship it.** A `Dockerfile` for the service and a `compose.yaml` that runs it next to n8n, with
  secrets from an `.env` file.

## How it's tested

The automated tests import `lead_pipeline.py` from the top of your repository, so keep that name
and keep these names in it: `Settings`, `Lead`, `Company`, `InvalidWebhook`, `verify_webhook`,
`score_lead`, `LeadPipeline` and `create_app`, with the signatures the starter gives them. They:

- call `verify_webhook(secret, header, body, now)` and `score_lead(lead, company)` directly, and
  build `Lead(...)` objects to check the validators;
- build `LeadPipeline(Settings(webhook_secret=...), enrich=..., crm=..., slack=..., sleep=...)` with
  three `httpx.Client`s whose transports are fresh copies of the starter's fakes (with their own
  tokens and secret), plus fakes that fail: a `500`, a timeout, or `429` with `Retry-After`. `sleep`
  is a function that records how long you asked to wait, so use `self.sleep`, never `time.sleep`;
- call `create_app(settings, pipeline, clock=...)` and send requests to it with FastAPI's
  `TestClient`, which runs the background task before it returns, then check `GET /leads/{id}`,
  `app.state.leads` and what each fake recorded;
- capture every log record at `DEBUG` and check that no secret or token appears in them;
- run `python lead_pipeline.py` and compare its output with the sample run, line by line.

So importing `lead_pipeline.py` must not read an environment variable or create a real client: that
belongs in `main.py`, which the tests don't import. Your `requirements.txt` (or `pyproject.toml`)
must list `fastapi`, `httpx` and `pydantic`. The n8n build and the README are checked by the review,
not by these tests.

## How to submit

Push `lead_pipeline.py`, `main.py`, your tests, `lab_services.py`, `lead-intake.n8n.json` and a
`README.md` to a GitHub repository. Connect the repository on this capstone's page and add the
workflow file it gives you as `.github/workflows/pylearn.yml`: the tests above then run on every
push, and the page shows the results. Submit the repository's link on the same page. The README says
how to run the demo, the tests and the n8n lab, and ends with your recommendation to Brightside:
which build they should run, what each costs to run and to change, who can maintain it, and what
the n8n build gives up (signature checks, tests, typed validation) or gains (visibility, easy
edits by the ops team). Beyond those tests, the review imports your workflow into n8n and reads your
code and README against the criteria.
