import hashlib
import json

SLOT_TAKEN = "That slot was just taken by another patient. Call find_slots again for free times."


def idempotency_key(tool_name, arguments):
    """The same key for the same tool call, whatever order the arguments are in."""
    canonical = json.dumps(arguments, sort_keys=True, separators=(",", ":"), default=str)
    return f"{tool_name}:{hashlib.sha256(canonical.encode()).hexdigest()[:16]}"


def book_appointment(client, practitioner: str, start: str, patient_email: str) -> dict:
    """Book a slot for a patient. Safe to call twice with the same arguments."""
    existing = client.get("/v1/bookings", params={"practitioner": practitioner, "start": start})
    existing.raise_for_status()
    bookings = existing.json()["bookings"]
    for booking in bookings:
        if booking["patient_email"] == patient_email:
            return {"booking_id": booking["booking_id"], "status": "already_booked"}
    if bookings:
        return {"error": SLOT_TAKEN}

    arguments = {"practitioner": practitioner, "start": start, "patient_email": patient_email}
    response = client.post(
        "/v1/bookings",
        json=arguments,
        headers={"Idempotency-Key": idempotency_key("book_appointment", arguments)},
    )
    if response.status_code == 409:
        return {"error": SLOT_TAKEN}
    response.raise_for_status()
    return {"booking_id": response.json()["booking_id"], "status": "booked"}
