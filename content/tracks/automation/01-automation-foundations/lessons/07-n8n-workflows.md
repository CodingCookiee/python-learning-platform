---
slug: n8n-workflows
title: n8n workflows and your Python service
summary: Run n8n locally, and build workflows from triggers, nodes, credentials, expressions and the Code node. Then hand the hard parts to your own Python service.
minutes: 55
exercises:
  - auto-n8n-items
  - auto-predict-n8n-items
  - auto-flatten-form-payload
  - auto-render-expression
  - auto-group-order-items
---

Half the agencies you'll work with already use a workflow tool, and the other half will ask
whether they should. **n8n** is the one developers like: you build workflows by connecting nodes on
a canvas, it runs on your own server if you want, and when a node can't do something you drop in
code. For client work, that gives you a workflow the client's ops person can read and adjust, with
your Python service doing the parts that need tests, libraries or real logic. This lesson is mostly
a local lab: you'll run n8n on your machine and build the agency's lead intake in it. The drills
practise what you'll write inside it: the transforms that reshape one JSON payload into another.

> [!NOTE]
> Zapier and Make are cloud-only and bill per task or operation, which means every step of every
> run. n8n can be self-hosted for free under its fair-code licence, and its cloud plans count
> whole workflow runs. For high-volume or data-sensitive clients that difference often decides it.

## Run n8n locally

With Docker from the last lesson, one command starts n8n, keeping its data in a named volume:

```bash
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Open `http://localhost:5678`, create the owner account, and you're on an empty canvas. (Without
Docker, `npx n8n` works too, if you have Node.js.)

## Workflows, nodes and items

A workflow is a graph of **nodes**. The first is a **trigger**: a Webhook node (an HTTP request
arrives), a Schedule Trigger (cron, as in lesson 3), or an app trigger ("new row in Google Sheets").
Every other node takes the previous node's output, does one thing, and passes its output on.

What flows between nodes is a list of **items**, and each item wraps its data in a `json` key:

```json
[
  { "json": { "email": "amira@example.com", "name": "Amira Haddad" } },
  { "json": { "email": "tom@example.com", "name": "Tom Price" } }
]
```

A node runs once per item, unless it's designed to work on the whole list (like Aggregate or the
Code node's "all items" mode). So "send a Slack message" after a node that outputs 40 items sends
40 messages. In Python terms, items are a list of dicts, each with one key:

```python
rows = [{"email": "amira@example.com"}, {"email": "tom@example.com"}]
items = [{"json": row} for row in rows]
[item["json"]["email"] for item in items]
```

## Triggers and webhook URLs

Add a **Webhook** node, set its method to `POST` and its path to `lead-intake`. n8n gives it two
URLs:

- the **test URL**, `http://localhost:5678/webhook-test/lead-intake`, which works only while you've
  clicked "Listen for test event" in the editor, and shows you the data it received;
- the **production URL**, `http://localhost:5678/webhook/lead-intake`, which works once the
  workflow is **active**.

Send it a lead:

```bash
curl -X POST http://localhost:5678/webhook-test/lead-intake \
  -H "Content-Type: application/json" \
  -d '{"name": " Amira Haddad ", "email": "Amira@Example.com", "company": "Haddad Physio"}'
```

The Webhook node's output item holds the whole request: `headers`, `params`, `query` and `body`,
so the email is at `body.email`. The Webhook node can check a header or basic-auth credential; for
signed webhooks like lesson 4's, verify the signature in your Python service instead.

## Expressions

Any node parameter can be an **expression** instead of fixed text: `{{ }}` around JavaScript that
can see the current item and earlier nodes' output.

| Expression | Means |
|------------|-------|
| `{{ $json.body.email }}` | a field of the current item |
| `{{ $json.body.name.trim() }}` | any JavaScript on it |
| `{{ $('Form webhook').item.json.body.company }}` | the matching item from an earlier node, by name |
| `{{ $now.toISO() }}` | the current time |

A Slack node's text might be `New lead: {{ $json.name }} ({{ $json.company }})`. The fourth drill
builds a small renderer for the `$json` part, which is the best way to understand what n8n does
with a template:

```python
import re

item = {"json": {"name": "Amira Haddad", "company": "Haddad Physio"}}
template = "New lead: {{ $json.name }} ({{ $json.company }})"
re.sub(r"\{\{\s*\$json\.(\w+)\s*\}\}", lambda m: str(item["json"][m.group(1)]), template)
```

## Credentials

Never paste a token into a node parameter or an expression. n8n has **credentials**: saved
per-service logins (a Slack OAuth connection, an API key, a "Header Auth" pair) stored encrypted in
its database with the instance's encryption key. Nodes refer to a credential by name, exported
workflows contain only that reference, and you can share a workflow without sharing the keys.
Set `N8N_ENCRYPTION_KEY` yourself for a real deployment, and back it up: without it, the saved
credentials can't be decrypted.

```quiz
question: "You export a workflow as JSON to send to a client. Its HTTP Request node uses a Header Auth credential with your service's API key. What's in the export?"
options:
  - "The API key, in plain text inside the node's parameters"
  - "A reference to the credential by id and name, but not the key itself"
  - "Nothing about authentication; the client has to rebuild the node"
answer: 1
explain: "Exports reference credentials without their secrets. The client creates a credential with the same name in their own n8n, and the node picks it up."
```

## The Code node

When the built-in nodes can't express a transform, the **Code node** runs your own code, in
JavaScript or Python. In "Run Once for All Items" mode it gets every item and must return a list of
items:

```javascript
// Code node, JavaScript, "Run Once for All Items"
return $input.all().map((item) => ({
  json: {
    name: item.json.body.name.trim(),
    email: item.json.body.email.trim().toLowerCase(),
    company: item.json.body.company || null,
    source: "website",
  },
}));
```

> [!JS]
> This is plain JavaScript, so everything you know applies, including the trap from the second
> drill: `item.json` is an object other nodes may share, so build new objects instead of mutating
> the ones you were given.

Python works in the Code node too, with the same shape (a list of `{"json": ...}` in, a list out),
but the variable names for the input depend on your n8n version, so start from the placeholder code
the node shows you. Keep Code nodes short: a few lines of reshaping. When the logic needs tests,
third-party libraries, a database or secrets, it belongs in your own service.

## Calling your own Python service

The pattern that scales: n8n does the wiring and the visibility, and an **HTTP Request** node
calls a small FastAPI service you wrote, tested and deployed, for the real work. For the lab, this
service receives normalised leads, checks an API key, and scores them:

```python norun
# lead_service.py: uv add "fastapi[standard]"; run with LEAD_API_KEY=... uv run fastapi dev lead_service.py
import hmac
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI()

class Lead(BaseModel):
    name: str
    email: str
    company: str | None = None
    source: str

@app.post("/leads")
def score_lead(lead: Lead, x_api_key: str = Header()):
    if not hmac.compare_digest(x_api_key, os.environ["LEAD_API_KEY"]):
        raise HTTPException(status_code=401, detail="bad API key")
    score = 50 + (30 if lead.company else 0) + (20 if not lead.email.endswith("@gmail.com") else 0)
    print(f"received {lead.email} from n8n, score {score}")
    return {"email": lead.email, "score": score, "priority": "high" if score >= 80 else "normal"}
```

In the HTTP Request node, set the method to `POST`, the URL to
`http://host.docker.internal:8000/leads` (from inside the n8n container, `localhost` is the
container itself; on Linux add `--add-host=host.docker.internal:host-gateway` to `docker run`),
send the body as JSON with the expression `{{ $json }}`, and add a **Header Auth** credential named
`x-api-key`. In the node's settings, turn on **Retry On Fail**, so a restart of your service
doesn't lose a lead.

A trimmed export of the finished workflow looks like this (parameter names shift a little between
n8n versions, so build it in the editor rather than typing this in):

```json
{
  "name": "Lead intake",
  "nodes": [
    { "name": "Form webhook", "type": "n8n-nodes-base.webhook",
      "parameters": { "httpMethod": "POST", "path": "lead-intake" } },
    { "name": "Normalise", "type": "n8n-nodes-base.code",
      "parameters": { "jsCode": "return $input.all().map((item) => ({ json: { ... } }));" } },
    { "name": "Score lead", "type": "n8n-nodes-base.httpRequest",
      "parameters": { "method": "POST", "url": "http://host.docker.internal:8000/leads" } }
  ],
  "connections": {
    "Form webhook": { "main": [[{ "node": "Normalise", "type": "main", "index": 0 }]] },
    "Normalise": { "main": [[{ "node": "Score lead", "type": "main", "index": 0 }]] }
  }
}
```

## Do it on your machine

1. Start n8n with the `docker run` command above and create the owner account.
2. Start the lead service: `LEAD_API_KEY=lab-key-change-me uv run fastapi dev lead_service.py`, and
   check `http://localhost:8000/docs` loads.
3. Build the workflow: a **Webhook** node (`POST`, path `lead-intake`), a **Code** node with the
   JavaScript above, and an **HTTP Request** node calling the service with a Header Auth credential.
4. Click "Listen for test event" on the Webhook node and send the `curl` request from earlier.
   Step through each node's output in the editor.
5. **Verify it reached you:** the service's terminal prints `received amira@example.com from n8n, score …`.
   If you get a 401 instead, the credential's header name or value is wrong; if the request never
   arrives, check the `host.docker.internal` URL.
6. Add a fourth node: an IF node on `{{ $json.priority }}` equal to `high`, then a Slack node
   (with a Slack credential from lesson 5) posting to your test channel.
7. Activate the workflow and send the `curl` request to the **production** URL. Open the
   Executions list and read the run.
8. Stop your service and send one more lead. Watch Retry On Fail try again, then see the failed
   execution; restart the service and use "Retry" on the execution.

## Where this leaves you

n8n passes lists of items between nodes, each item's data under `json`. Triggers start workflows,
expressions pull values from the current item and earlier nodes, credentials keep secrets out of
workflows, and the Code node handles small reshaping. Anything bigger goes to your own Python
service over HTTP. The drills practise exactly those reshaping jobs: items, a real form tool's
webhook payload, expression rendering, and grouping line items into orders. The capstone builds
the whole lead pipeline twice, once in Python and once in n8n.
