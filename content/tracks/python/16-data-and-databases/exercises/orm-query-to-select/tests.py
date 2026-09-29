from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from plp import test, hidden, source_avoids, source_uses
from solution import Base, Invoice, by_number, count_for, outstanding_by_customer, overdue


def fresh_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = Session(engine)
    session.add_all([
        Invoice(number="INV-001", customer="Acme", amount_cents=125000, status="sent", due_on=date(2026, 9, 15)),
        Invoice(number="INV-002", customer="Globex", amount_cents=4000, status="paid", due_on=date(2026, 9, 1)),
        Invoice(number="INV-003", customer="Initech", amount_cents=38000, status="sent", due_on=date(2026, 9, 10)),
        Invoice(number="INV-004", customer="Acme", amount_cents=45000, status="sent", due_on=date(2026, 9, 30)),
        Invoice(number="INV-005", customer="Hooli", amount_cents=9900, status="draft", due_on=date(2026, 9, 5)),
    ])
    session.commit()
    return session


@test("Returns what the legacy queries returned")
def _():
    with fresh_session() as session:
        assert [invoice.number for invoice in overdue(session, date(2026, 9, 20))] == ["INV-003", "INV-001"]
        assert by_number(session, "INV-002").customer == "Globex"
        assert count_for(session, "Acme") == 2
        assert [tuple(row) for row in outstanding_by_customer(session)] == [("Acme", 170000), ("Initech", 38000)]


@test("Uses select() and no session.query()")
def _():
    assert source_avoids(call="query"), "Replace every session.query(...) with a select() statement"
    assert source_uses(call="select"), "Build the queries with select()"


@test("Unknown numbers and customers")
def _():
    with fresh_session() as session:
        assert by_number(session, "INV-999") is None
        assert count_for(session, "Umbrella") == 0


@hidden("overdue returns Invoice objects and nothing on an early date")
def _():
    with fresh_session() as session:
        assert all(isinstance(invoice, Invoice) for invoice in overdue(session, date(2026, 10, 1)))
        assert [invoice.number for invoice in overdue(session, date(2026, 10, 1))] == ["INV-003", "INV-001", "INV-004"]
        assert list(overdue(session, date(2026, 9, 1))) == []


@hidden("Outstanding totals change when an invoice is paid")
def _():
    with fresh_session() as session:
        by_number(session, "INV-003").status = "paid"
        session.commit()
        assert [tuple(row) for row in outstanding_by_customer(session)] == [("Acme", 170000)]
