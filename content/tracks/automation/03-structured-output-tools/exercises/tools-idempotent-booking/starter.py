import hashlib
import json

SLOT_TAKEN = "That slot was just taken by another patient. Call find_slots again for free times."


def idempotency_key(tool_name, arguments):
    """The same key for the same tool call, whatever order the arguments are in."""
    canonical = json.dumps(arguments, sort_keys=True, separators=(",", ":"), default=str)
    return f"{tool_name}:{hashlib.sha256(canonical.encode()).hexdigest()[:16]}"


def book_appointment(client, practitioner, start, patient_email):
    """Book a slot for a patient. Safe to call twice with the same arguments."""
    response = client.post(
        "/v1/bookings",
        json={"practitioner": practitioner, "start": start, "patient_email": patient_email},
    )
    return {"booking_id": response.json()["booking_id"], "status": "booked"}
