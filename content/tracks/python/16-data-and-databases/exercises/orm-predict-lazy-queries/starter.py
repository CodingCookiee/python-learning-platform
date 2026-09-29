from sqlalchemy import ForeignKey, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, joinedload, mapped_column, relationship, selectinload


class Base(DeclarativeBase):
    pass


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    total_cents: Mapped[int]
    customer: Mapped[Customer] = relationship(back_populates="orders")


engine = create_engine("sqlite://")
Base.metadata.create_all(engine)
with Session(engine) as session:
    session.add_all([
        Customer(name="Acme", orders=[Order(total_cents=42000), Order(total_cents=18000)]),
        Customer(name="Globex", orders=[Order(total_cents=75000)]),
        Customer(name="Initech"),
    ])
    session.commit()

queries = []
event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, *rest: queries.append(sql))


def count(work):
    queries.clear()
    with Session(engine) as session:
        work(session)
    return len(queries)


print(count(lambda s: [c.name for c in s.scalars(select(Customer))]))
print(count(lambda s: [len(c.orders) for c in s.scalars(select(Customer))]))
print(count(lambda s: [len(c.orders) for c in s.scalars(select(Customer).options(selectinload(Customer.orders)))]))
print(count(lambda s: [o.customer.name for o in s.scalars(select(Order))]))
print(count(lambda s: [o.customer.name for o in s.scalars(select(Order).options(joinedload(Order.customer)))]))
print(count(lambda s: (s.get(Customer, 1), s.get(Customer, 1))))
