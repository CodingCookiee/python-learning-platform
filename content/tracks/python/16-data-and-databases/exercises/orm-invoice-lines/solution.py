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
    lines: Mapped[list["InvoiceLine"]] = relationship(back_populates="invoice", order_by="InvoiceLine.id")

    @property
    def total_cents(self):
        return sum(line.quantity * line.unit_price_cents for line in self.lines)


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    description: Mapped[str]
    quantity: Mapped[int]
    unit_price_cents: Mapped[int]
    invoice: Mapped[Invoice] = relationship(back_populates="lines")


def create_invoice(session, number, customer, lines):
    """Add a sent invoice with these (description, quantity, unit_price_cents) lines and return it."""
    if not lines:
        raise ValueError(f"{number}: an invoice needs at least one line")
    for description, quantity, _ in lines:
        if quantity < 1:
            raise ValueError(f"{number}: quantity for {description!r} must be at least 1")
    invoice = Invoice(
        number=number,
        customer=customer,
        status="sent",
        lines=[
            InvoiceLine(description=description, quantity=quantity, unit_price_cents=price)
            for description, quantity, price in lines
        ],
    )
    session.add(invoice)
    return invoice


def outstanding(session):
    """[(customer, total_cents), ...] for sent invoices, biggest first, ties by customer. One query."""
    total = func.sum(InvoiceLine.quantity * InvoiceLine.unit_price_cents)
    stmt = (
        select(Invoice.customer, total)
        .join(Invoice.lines)
        .where(Invoice.status == "sent")
        .group_by(Invoice.customer)
        .order_by(total.desc(), Invoice.customer)
    )
    return [tuple(row) for row in session.execute(stmt)]
