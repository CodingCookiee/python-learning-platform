from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


class Base(DeclarativeBase):
    pass


class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str]
    status: Mapped[str] = mapped_column(default="draft")


engine = create_engine("sqlite://")
Base.metadata.create_all(engine)

with Session(engine) as session:
    invoice = Invoice(number="INV-001")
    session.add(invoice)
    print(invoice.id, invoice.status)
    session.flush()
    print(invoice.id, invoice.status)
    print(session.get(Invoice, 1) is invoice)
    invoice.status = "sent"
    print(session.scalars(select(Invoice.status)).one())
    session.rollback()
    print(session.scalars(select(Invoice.number)).all())

with Session(engine) as session:
    session.add(Invoice(number="INV-002"))
    session.commit()

with Session(engine) as first_session, Session(engine) as second_session:
    first = first_session.get(Invoice, 1)
    second = second_session.get(Invoice, 1)
    print(first is second, first.number, second.status)
