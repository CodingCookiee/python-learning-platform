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

and an `app = create_app(settings, pipeline)` at module level for `fastapi run` to find.
