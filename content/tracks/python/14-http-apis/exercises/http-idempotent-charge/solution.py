import time
import uuid

import httpx

RETRY_STATUSES = {429, 500, 502, 503, 504}


def new_idempotency_key():
    return str(uuid.uuid4())


def create_charge(client, amount, currency, customer, *, idempotency_key=None, attempts=3,
                  sleep=time.sleep, new_key=new_idempotency_key):
    """Charge a customer, retrying safely with one idempotency key for every attempt."""
    key = idempotency_key or new_key()
    body = {"amount": amount, "currency": currency, "customer": customer}
    for attempt in range(attempts):
        try:
            response = client.post("/v1/charges", json=body, headers={"Idempotency-Key": key})
            return response.raise_for_status().json()
        except httpx.HTTPStatusError as error:
            if error.response.status_code not in RETRY_STATUSES or attempt == attempts - 1:
                raise
        except httpx.TransportError:
            if attempt == attempts - 1:
                raise
        sleep(2 ** attempt)
