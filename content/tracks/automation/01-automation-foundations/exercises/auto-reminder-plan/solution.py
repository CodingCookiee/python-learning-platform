from datetime import timedelta

EARLIEST = timedelta(hours=2)
LATEST = timedelta(hours=24)


def choose_channel(patient):
    if patient.get("mobile") and patient.get("sms_ok"):
        return "sms", patient["mobile"]
    if patient.get("email"):
        return "email", patient["email"]
    return None


def plan_reminders(appointments, now):
    """Return [{"appointment", "channel", "to"}] for appointments due a reminder, by start time."""
    due = []
    for appt in sorted(appointments, key=lambda a: a["starts"]):
        if appt["status"] != "booked" or appt["reminded"]:
            continue
        if not now + EARLIEST < appt["starts"] <= now + LATEST:
            continue
        channel = choose_channel(appt["patient"])
        if channel is None:
            continue
        kind, to = channel
        due.append({"appointment": appt["id"], "channel": kind, "to": to})
    return due
