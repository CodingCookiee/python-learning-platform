import hashlib
import hmac
import json

from fastapi import FastAPI, HTTPException, Request

SECRET = "test-secret-forms"  # read from an environment variable in real code

app = FastAPI()
received = []  # stands in for the queue of leads to process


def expected_signature(timestamp, body):
    return hmac.new(SECRET.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()


@app.post("/webhooks/forms")
async def form_submitted(request: Request):
    payload = await request.json()
    header = request.headers.get("webhook-signature", "")
    parts = dict(item.split("=", 1) for item in header.split(",") if "=" in item)

    body = json.dumps(payload).encode()
    expected = expected_signature(parts.get("t", ""), body)
    if not hmac.compare_digest(expected, parts.get("v1", "")):
        raise HTTPException(status_code=401, detail="bad signature")

    received.append(payload)
    return {"ok": True}
