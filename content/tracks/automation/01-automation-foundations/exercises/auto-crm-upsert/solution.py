import time

import httpx

MAX_ATTEMPTS = 3
DEFAULT_WAIT = 30.0  # Airtable's advice when it doesn't say how long
FIELD_NAMES = {"email": "Email", "name": "Name", "company": "Company", "phone": "Phone"}


def send(client, method, url, *, sleep, **kwargs):
    """One request, retried after a pause on 429, at most MAX_ATTEMPTS times."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        response = client.request(method, url, **kwargs)
        if response.status_code != 429 or attempt == MAX_ATTEMPTS:
            break
        sleep(float(response.headers.get("Retry-After", DEFAULT_WAIT)))
    response.raise_for_status()
    return response.json()


def upsert_contact(client, base_id, lead, *, sleep=time.sleep):
    """Create or update the Contacts record for lead's email; return (record_id, "created" | "updated")."""
    email = lead["email"].strip().lower()
    formula = "{Email}='" + email.replace("'", "\\'") + "'"
    table = f"/{base_id}/Contacts"

    found = send(client, "GET", table, params={"filterByFormula": formula}, sleep=sleep)["records"]

    fields = {FIELD_NAMES[key]: value for key, value in lead.items() if key in FIELD_NAMES and value}
    fields["Email"] = email

    if found:
        record = send(client, "PATCH", f"{table}/{found[0]['id']}", json={"fields": fields}, sleep=sleep)
        return record["id"], "updated"
    record = send(client, "POST", table, json={"fields": fields}, sleep=sleep)
    return record["id"], "created"
