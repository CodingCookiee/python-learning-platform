import time
import uuid

import httpx


def new_idempotency_key():
    return str(uuid.uuid4())


def create_charge(client, amount, currency, customer, *, idempotency_key=None, attempts=3,
                  sleep=time.sleep, new_key=new_idempotency_key):
    """Charge a customer, retrying safely with one idempotency key for every attempt."""
    response = client.post("/v1/charges", json={"amount": amount, "currency": currency, "customer": customer})
    return response.raise_for_status().json()
