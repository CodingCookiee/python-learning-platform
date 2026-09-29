---
slug: saas-integrations
title: Integrating SaaS APIs
summary: Post to Slack, append rows to Google Sheets and upsert CRM records, with timeouts, escaping, rate limits and the error cases each API hides.
minutes: 50
exercises:
  - auto-slack-escape
  - auto-post-to-slack
  - auto-fix-missing-timeout
  - auto-append-sheet-rows
  - auto-crm-upsert
---

The agency's webhook receiver now has a verified, deduplicated lead in its queue. The worker has
to put it in three places: a message in the account manager's Slack channel, a row in the Google
Sheet the agency owner has used for six years and won't give up, and a contact in the CRM, created
or updated. That's the typical shape of automation work: most of the code isn't clever, it's
**integration**. Each service has its own URL scheme, auth and quirks, and each one fails in its
own way. You built typed, retrying API clients in module 14. This lesson is about what's specific
to the services clients actually use.

## Every SaaS API is the same five things

Strip away the branding and every integration needs the same five answers:

| Question | Slack | Google Sheets | Airtable |
|----------|-------|---------------|----------|
| Base URL | `https://slack.com/api` | `https://sheets.googleapis.com/v4` | `https://api.airtable.com/v0` |
| Auth | bot token, `Bearer xoxb-…` | OAuth access token (a service account) | personal access token, `Bearer pat…` |
| Body | JSON | JSON, rows as lists | JSON, `{"fields": {...}}` |
| Errors | **HTTP 200** with `"ok": false` | HTTP status and `{"error": {...}}` | HTTP status and `{"error": {...}}` |
| Limits | per-method tiers, `429` + `Retry-After` | per-minute quotas, `429` | 5 requests a second per base, `429` |

One `httpx.Client` per service, with its base URL, auth header and timeout set once, keeps the rest
of your code about leads rather than HTTP. In the browser, `httpx.MockTransport` stands in for the
service, exactly as in module 14:

```python
import httpx

def fake_slack(request):
    return httpx.Response(200, json={"ok": True, "channel": "C024BE91L", "ts": "1773072000.000100"})

slack = httpx.Client(
    base_url="https://slack.com/api",
    headers={"Authorization": "Bearer test-token"},      # os.environ["SLACK_BOT_TOKEN"] for real
    timeout=httpx.Timeout(10.0, connect=5.0),
    transport=httpx.MockTransport(fake_slack),
)
slack.post("/chat.postMessage", json={"channel": "#leads", "text": "New lead: Amira Haddad"}).json()
```

The drills use the course's `fake_api` helper, which does the same with routes and records every
request so tests can check exactly what you sent.

## Slack: messages, escaping, and ok: false

`chat.postMessage` posts as your Slack app's bot. It takes a `channel` and a `text` (and optionally
`blocks`, Slack's layout format), and returns the message's `ts`, its id. Two things catch everyone.

First, **Slack reports most errors with HTTP 200**. `raise_for_status()` won't notice a wrong
channel or a revoked token; only the body's `ok` field does:

```python
import httpx

def fake_slack(request):
    return httpx.Response(200, json={"ok": False, "error": "channel_not_found"})

client = httpx.Client(base_url="https://slack.com/api", transport=httpx.MockTransport(fake_slack))
response = client.post("/chat.postMessage", json={"channel": "#leeds", "text": "New lead"})
response.status_code, response.json()
```

Second, Slack's text format gives three characters special meaning: `&`, `<` and `>`. `<!channel>`
notifies everyone in the channel, and `<https://example.com|click here>` is a link. The text comes
from a stranger's form submission, so escape it before you post, or the first joker who types
`<!channel>` in the name field pings the whole agency.

> [!TIP]
> For "just post a message to one channel", Slack's **incoming webhooks** are simpler still: a
> secret URL you POST `{"text": "..."}` to, no token needed. Treat the URL as a password.

## Timeouts are not optional

httpx gives every request a 5-second timeout by default. `requests` has no default at all: a
server that accepts the connection and never answers holds your worker for ever. People switch
timeouts off (`timeout=None`) to fix a slow report, and six months later the CRM has a bad
afternoon and the whole lead queue stops behind one hung request.

Set a timeout on every client, and decide what a timeout *means*. For a lead, a timeout is a
"try again later", not a crash and not a silent drop: log it, leave the lead in the queue, and let
the next run retry.

```python
import httpx

httpx.Client().timeout, httpx.Client(timeout=httpx.Timeout(10.0, connect=5.0)).timeout
```

`connect` is how long to wait to reach the server; the main number covers each read, write and
wait for a free connection. `httpx.TimeoutException` is the base class of all four kinds.

## Google Sheets: rows are lists

A sheet has no column names, only positions. To append leads you send
`POST /spreadsheets/{id}/values/{range}:append` with a list of rows, each a list of cell values in
column order:

```json
{
  "values": [
    ["2026-03-09T08:14:00", "Amira Haddad", "amira@example.com", "Haddad Physio"],
    ["2026-03-09T08:31:00", "Tom Price", "tom@example.com", ""]
  ]
}
```

So your code owns the column order, in one list, and turns each lead dict into a row with it. The
query parameter `valueInputOption` decides how Sheets reads the values:

- `USER_ENTERED` treats them as if typed: `2026-03-09` becomes a date, `+447700900123` becomes a
  number, and anything starting with `=` becomes a **formula**. A lead who types
  `=IMPORTXML(...)` in a form field gets to run a formula in the owner's sheet.
- `RAW` stores exactly what you sent. Use it for anything that came from outside.

```python
columns = ["received_at", "name", "email", "company"]
lead = {"name": "Tom Price", "email": "tom@example.com", "received_at": "2026-03-09T08:31:00"}
[lead.get(column) or "" for column in columns]
```

On your machine, Google's auth is a **service account**: a robot Google account with a JSON key
file. You share the sheet with the service account's email address, and the `google-auth` package
turns the key file into access tokens:

```python norun
import httpx
from google.auth.transport.requests import Request
from google.oauth2 import service_account

creds = service_account.Credentials.from_service_account_file(
    "service-account.json", scopes=["https://www.googleapis.com/auth/spreadsheets"]
)
creds.refresh(Request())
sheets = httpx.Client(
    base_url="https://sheets.googleapis.com/v4",
    headers={"Authorization": f"Bearer {creds.token}"},
    timeout=10,
)
```

## CRMs: find, then create or update

A CRM must never end up with two contacts for one person. That makes CRM writes **upserts**:
look the contact up by a natural key (almost always the email address, lower-cased), update it if
it exists, create it if it doesn't. With Airtable, the lookup is a formula in a query parameter:

```text
GET  /v0/appAgency/Contacts?filterByFormula={Email}='amira@example.com'
       → {"records": [{"id": "recX1", "fields": {...}}]}   or   {"records": []}
PATCH /v0/appAgency/Contacts/recX1     {"fields": {"Name": "Amira Haddad"}}
POST  /v0/appAgency/Contacts           {"fields": {"Email": "...", "Name": "..."}}
```

Three rules keep upserts safe:

- **Normalise the key**: `" Amira@Example.com "` and `"amira@example.com"` are the same person.
- **Don't overwrite with blanks.** If this form had no phone field, leave out `Phone` rather than
  send an empty one and wipe what the sales team typed in.
- **Respect rate limits.** Airtable allows 5 requests a second per base, and a burst of leads
  after downtime will hit it. On `429`, wait (`Retry-After` if the API sends it) and retry a few
  times, as in module 14.

```python
email = " Amira@Example.com "
key = email.strip().lower()
formula = "{Email}='" + key.replace("'", "\\'") + "'"
formula
```

Some APIs have a native upsert (Airtable's `performUpsert`, HubSpot's batch upsert by email). Use
it when it exists; the find-then-write version is what you write for every API that doesn't.

## Email is another JSON API

Clients ask for emails as often as Slack messages. For a handful a day from one mailbox, Python's
standard library sends through SMTP. For anything customers receive, use a transactional email
service (Postmark, SendGrid, Resend, Amazon SES): they handle deliverability, bounces and
unsubscribe rules, and sending is a `POST` with JSON like every API above. Either way, build the
message with `email.message.EmailMessage`, which gets the headers and encodings right:

```python
from email.message import EmailMessage

msg = EmailMessage()
msg["From"] = "Leads bot <leads@agency.example>"
msg["To"] = "amira@example.com"
msg["Subject"] = "Thanks, Amira: we'll be in touch today"
msg.set_content("Hi Amira,\n\nThanks for your enquiry. Zoë from our team will call you this afternoon.\n")
print(msg.as_string()[:300])
```

```python norun
import os
import smtplib

with smtplib.SMTP("smtp.example.com", 587, timeout=10) as smtp:
    smtp.starttls()
    smtp.login("leads@agency.example", os.environ["SMTP_PASSWORD"])
    smtp.send_message(msg)
```

```quiz
question: "Where should the Slack bot token for a client's automation live?"
options:
  - "In the Python file, so the automation works wherever it's copied"
  - "In an environment variable or the platform's secret store, read with os.environ"
  - "In the Google Sheet, so the client can change it"
answer: 1
explain: "Tokens go in environment variables, a .env file that's in .gitignore, or the host's secret store (GitHub Actions secrets, n8n credentials). Code in a repository gets copied, shared and pushed; a token in it is a token leaked."
```

## Do it on your machine

1. Create a Slack workspace for testing, then a Slack app at `api.slack.com/apps` with the
   `chat:write` scope. Install it, copy the bot token (`xoxb-…`) into a `.env` file, and invite the
   bot to a channel with `/invite @yourbot`.
2. Post a message with httpx using the token from the environment. Then post to a channel that
   doesn't exist and print the `ok: false` body.
3. Create a Google Cloud project, enable the Sheets API, create a service account with a JSON key,
   and share a test sheet with the account's email. Append one row with `valueInputOption=RAW`, then
   one with `USER_ENTERED` containing `=1+1`, and compare.
4. Create an Airtable base with a Contacts table (Email, Name, Company) and a personal access token
   scoped to it. Upsert the same contact twice and check there's still one record.

## Where this leaves you

Every integration is a base URL, auth, a body shape, an error style and a rate limit. Slack
reports errors in the body and needs escaping, every client needs a timeout and a plan for when it
fires, Sheets rows are lists in a fixed column order written `RAW`, and CRM writes are upserts on a
normalised email that never overwrite with blanks. The drills build each one against fakes that
behave like the real services.
