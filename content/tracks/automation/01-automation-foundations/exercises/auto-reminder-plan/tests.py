from datetime import UTC, datetime, timedelta

from plp import hidden, test
from solution import plan_reminders

NOW = datetime(2026, 3, 9, 8, 0, tzinfo=UTC)
AMIRA = {"name": "Amira", "mobile": "+447700900123", "email": "amira@example.com", "sms_ok": True}
TOM = {"name": "Tom", "mobile": "+447700900456", "email": "tom@example.com", "sms_ok": False}
NIA = {"name": "Nia", "mobile": None, "email": None, "sms_ok": False}


def appt(id, hours, patient=AMIRA, status="booked", reminded=False):
    return {"id": id, "status": status, "starts": NOW + timedelta(hours=hours), "reminded": reminded, "patient": patient}


@test("Reminds tomorrow's booking by SMS and skips one starting in an hour")
def _():
    assert plan_reminders([appt(501, 23, AMIRA), appt(502, 1, TOM)], NOW) == [
        {"appointment": 501, "channel": "sms", "to": "+447700900123"}
    ]


@test("Falls back to email when the patient hasn't agreed to SMS")
def _():
    assert plan_reminders([appt(503, 6, TOM)], NOW) == [
        {"appointment": 503, "channel": "email", "to": "tom@example.com"}
    ]


@test("Skips cancelled and already-reminded appointments")
def _():
    assert plan_reminders([appt(504, 6, status="cancelled"), appt(505, 6, reminded=True)], NOW) == []


@test("Orders the reminders by start time")
def _():
    result = plan_reminders([appt(510, 20), appt(511, 5, TOM), appt(512, 12)], NOW)
    assert [r["appointment"] for r in result] == [511, 512, 510]


@hidden("The window is more than 2 hours and at most 24 hours ahead")
def _():
    edges = [appt(520, 2), appt(521, 24), appt(522, 24.01), appt(523, 2.01)]
    assert [r["appointment"] for r in plan_reminders(edges, NOW)] == [523, 521]


@hidden("A patient with no mobile and no email gets no reminder")
def _():
    assert plan_reminders([appt(530, 8, NIA)], NOW) == []


@hidden("Doesn't change the appointments it was given")
def _():
    appointments = [appt(540, 8), appt(541, 3, TOM)]
    before = [dict(a) for a in appointments]
    plan_reminders(appointments, NOW)
    assert appointments == before
