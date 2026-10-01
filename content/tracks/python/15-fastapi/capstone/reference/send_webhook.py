"""Send a signed payment.succeeded event to the local service, as Paygate would."""

import json
import os
import sys
import time
import uuid

import httpx

from service import sign_webhook

booking_id, amount_cents = int(sys.argv[1]), int(sys.argv[2])
event = {
    "id": f"evt_{uuid.uuid4().hex[:12]}",
    "type": "payment.succeeded",
    "created": int(time.time()),
    "data": {"booking_id": booking_id, "amount_cents": amount_cents, "payment_id": "pay_local"},
}
body = json.dumps(event).encode()
signature = sign_webhook(body, os.environ["TIDEWATER_WEBHOOK_SECRET"], int(time.time()))

response = httpx.post(
    "http://127.0.0.1:8000/webhooks/paygate",
    content=body,
    headers={"Paygate-Signature": signature, "Content-Type": "application/json"},
)
print(response.status_code, response.json(), response.headers["x-request-id"])
