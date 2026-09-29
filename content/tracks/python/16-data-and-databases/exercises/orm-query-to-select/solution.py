from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(unique=True)
    customer: Mapped[str]
    amount_cents: Mapped[int]
    status: Mapped[str] = mapped_column(default="draft")
    due_on: Mapped[date]


def overdue(session, today):
    """Sent invoices due before today, earliest due first."""
    stmt = (
        select(Invoice)
        .where(Invoice.status == "sent", Invoice.due_on < today)
        .order_by(Invoice.due_on)
    )
    return session.scalars(stmt).all()


def by_number(session, number):
    """The invoice with this number, or None."""
    return session.scalars(select(Invoice).where(Invoice.number == number)).one_or_none()


def count_for(session, customer):
    """How many invoices this customer has."""
    return session.scalar(select(func.count()).select_from(Invoice).where(Invoice.customer == customer))


def outstanding_by_customer(session):
    """[(customer, total of sent invoices in cents), ...] by customer name."""
    stmt = (
        select(Invoice.customer, func.sum(Invoice.amount_cents))
        .where(Invoice.status == "sent")
        .group_by(Invoice.customer)
        .order_by(Invoice.customer)
    )
    return session.execute(stmt).all()
