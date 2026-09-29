def trigger(events):
    for event in events:
        print(f"trigger: {event['type']}")
        yield event


def context(event, patients):
    return {**event, "patient": patients.get(event["patient_id"])}


def decide(item):
    if item["patient"] is None:
        return "skip: unknown patient"
    if not item["patient"]["sms_ok"]:
        return "email"
    return "sms"


patients = {
    "p1": {"name": "Amira", "sms_ok": True},
    "p2": {"name": "Tom", "sms_ok": False},
}
events = [
    {"type": "booked", "patient_id": "p1"},
    {"type": "booked", "patient_id": "p9"},
    {"type": "cancelled", "patient_id": "p2"},
    {"type": "booked", "patient_id": "p2"},
]

for event in trigger(events):
    if event["type"] != "booked":
        continue
    action = decide(context(event, patients))
    print(f"action: {action}")
