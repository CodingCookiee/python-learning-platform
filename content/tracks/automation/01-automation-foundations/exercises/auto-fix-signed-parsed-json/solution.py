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
    raw = await request.body()
    header = request.headers.get("webhook-signature", "")
    parts = dict(item.split("=", 1) for item in header.split(",") if "=" in item)

    expected = expected_signature(parts.get("t", ""), raw)
    if not hmac.compare_digest(expected, parts.get("v1", "")):
        raise HTTPException(status_code=401, detail="bad signature")

    try:
        payload = json.loads(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="body is not valid JSON") from None

    received.append(payload)
    return {"ok": True}
