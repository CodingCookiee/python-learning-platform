from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from plp import test, hidden, raises
from solution import Base, Invoice, InvoiceLine, create_invoice, outstanding


def fresh_engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return engine


def query_counter(engine):
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, *rest: statements.append(sql))
    return statements


@test("Creates an invoice with lines and totals it")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        invoice = create_invoice(session, "INV-0042", "Acme", [("Desk, oak", 1, 30000), ("Lamp", 2, 4500)])
        assert invoice.total_cents == 39000
        session.commit()
        assert [tuple(row) for row in outstanding(session)] == [("Acme", 39000)]


@test("Lines are stored, in order, and point back at their invoice")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        create_invoice(session, "INV-0042", "Acme", [("Desk, oak", 1, 30000), ("Lamp", 2, 4500), ("Cable", 3, 1000)])
        session.commit()
    with Session(engine) as session:
        invoice = session.scalars(select(Invoice)).one()
        assert [line.description for line in invoice.lines] == ["Desk, oak", "Lamp", "Cable"]
        assert invoice.lines[0].invoice is invoice
        assert invoice.total_cents == 42000


@test("Refuses an invoice with no lines, or a quantity below 1")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        raises(ValueError, create_invoice, session, "INV-0043", "Globex", [])
        raises(ValueError, create_invoice, session, "INV-0044", "Globex", [("Chair", 0, 9000)])
        session.commit()
        assert session.scalar(select(func.count()).select_from(Invoice)) == 0
        assert session.scalar(select(func.count()).select_from(InvoiceLine)) == 0


@hidden("Outstanding totals per customer in one query, paid invoices left out")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        create_invoice(session, "INV-1", "Acme", [("Desk", 1, 30000)])
        create_invoice(session, "INV-2", "Globex", [("Chair", 2, 9000), ("Lamp", 1, 4500)])
        create_invoice(session, "INV-3", "Acme", [("Lamp", 2, 4500)])
        paid = create_invoice(session, "INV-4", "Initech", [("Desk", 5, 30000)])
        paid.status = "paid"
        session.commit()
        statements = query_counter(engine)
        assert [tuple(row) for row in outstanding(session)] == [("Acme", 39000), ("Globex", 22500)]
        assert len(statements) == 1, f"Expected one query, saw {len(statements)}"


@hidden("Ties on the total are broken by customer")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        create_invoice(session, "INV-1", "Umbrella", [("Desk", 1, 1000)])
        create_invoice(session, "INV-2", "Hooli", [("Desk", 1, 1000)])
        session.commit()
        assert [tuple(row) for row in outstanding(session)] == [("Hooli", 1000), ("Umbrella", 1000)]


@hidden("Doesn't commit")
def _():
    engine = fresh_engine()
    with Session(engine) as session:
        create_invoice(session, "INV-1", "Acme", [("Desk", 1, 30000)])
        session.rollback()
        assert session.scalar(select(func.count()).select_from(Invoice)) == 0
