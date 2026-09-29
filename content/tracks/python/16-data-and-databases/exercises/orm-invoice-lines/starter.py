from sqlalchemy import ForeignKey, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(unique=True)
    customer: Mapped[str]
    status: Mapped[str] = mapped_column(default="sent")
    # lines: the invoice's lines, in the order they were added

    @property
    def total_cents(self):
        ...


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    description: Mapped[str]
    quantity: Mapped[int]
    unit_price_cents: Mapped[int]
    # invoice: the invoice this line belongs to


def create_invoice(session, number, customer, lines):
    """Add a sent invoice with these (description, quantity, unit_price_cents) lines and return it."""
    ...


def outstanding(session):
    """[(customer, total_cents), ...] for sent invoices, biggest first, ties by customer. One query."""
    ...
