import httpx

from plp import hidden, test
from plp_fakes import fake_api
from solution import SLOT_TAKEN, book_appointment, idempotency_key

ADA = ("Patel", "2026-10-01T14:30", "ada@example.com")


def clinic(bookings=None, *, race=False):
    """A fake booking API. race=True answers every POST with 409, as if someone booked first."""
    store = list(bookings or [])

    def search(req):
        q = req["query"]
        return {"bookings": [b for b in store if b["practitioner"] == q.get("practitioner") and b["start"] == q.get("start")]}

    def create(req):
        if race:
            return 409, {"error": "slot taken"}
        booking = {"booking_id": f"BK-{5521 + len(store)}", **req.json}
        store.append(booking)
        return 201, booking

    server = fake_api({"GET /v1/bookings": search, "POST /v1/bookings": create})
    client = httpx.Client(transport=server.transport, base_url="https://clinic.example")
    return server, client, store


@test("Books once, and the repeat call reports already_booked")
def _():
    server, client, store = clinic()
    assert book_appointment(client, *ADA) == {"booking_id": "BK-5521", "status": "booked"}
    assert book_appointment(client, *ADA) == {"booking_id": "BK-5521", "status": "already_booked"}
    assert len(server.calls("POST /v1/bookings")) == 1
    assert len(store) == 1


@test("Checks the slot before creating anything")
def _():
    server, client, _ = clinic()
    book_appointment(client, *ADA)
    first = server.requests[0]
    assert (first["method"], first["path"]) == ("GET", "/v1/bookings")
    assert first["query"] == {"practitioner": "Patel", "start": "2026-10-01T14:30"}


@test("Sends the booking with an idempotency key")
def _():
    server, client, _ = clinic()
    book_appointment(client, *ADA)
    post = server.calls("POST /v1/bookings")[0]
    assert post["json"] == {"practitioner": "Patel", "start": "2026-10-01T14:30", "patient_email": "ada@example.com"}
    expected = idempotency_key("book_appointment", post["json"])
    assert post["headers"].get("idempotency-key") == expected


@test("Won't book a slot another patient has")
def _():
    taken = {"booking_id": "BK-5000", "practitioner": "Patel", "start": "2026-10-01T14:30", "patient_email": "grace@example.com"}
    server, client, _ = clinic([taken])
    assert book_appointment(client, *ADA) == {"error": SLOT_TAKEN}
    assert server.calls("POST /v1/bookings") == []


@hidden("A 409 from the API is the same error")
def _():
    server, client, _ = clinic(race=True)
    assert book_appointment(client, *ADA) == {"error": SLOT_TAKEN}


@hidden("Other slots and other practitioners don't count")
def _():
    other = {"booking_id": "BK-5000", "practitioner": "Okafor", "start": "2026-10-01T14:30", "patient_email": "ada@example.com"}
    server, client, store = clinic([other])
    assert book_appointment(client, *ADA)["status"] == "booked"
    assert book_appointment(client, "Patel", "2026-10-01T16:00", "ada@example.com")["status"] == "booked"
    assert len(store) == 3
