"""A tiny ORM for Anchor Tool Hire: validating fields, self-registering models, in-memory tables.

Run it with:  python tinyorm.py
"""

import re
from decimal import Decimal

MISSING = object()  # the default for "no default given": None can be a real default


# ---------------------------------------------------------------------------
# Fields: data descriptors that validate every assignment
# ---------------------------------------------------------------------------


class Field:
    """A data descriptor for one column. Subclasses override validate()."""

    def __init__(self, *, primary_key=False, default=MISSING):
        ...

    def __set_name__(self, owner, name):
        ...

    def __get__(self, instance, owner):
        ...

    def __set__(self, instance, value):
        ...

    def validate(self, value):
        """Return the value to store, or raise ValueError("Model.field: problem")."""
        return value


class IntegerField(Field):
    """An int (never a bool), optionally between min_value and max_value inclusive."""

    def __init__(self, *, min_value=None, max_value=None, **options):
        ...


class StringField(Field):
    """A non-empty str, optionally limited by max_length, a regex pattern and a tuple of choices."""

    def __init__(self, *, max_length=None, pattern=None, choices=None, **options):
        ...


class DecimalField(Field):
    """A Decimal (an int is converted; a float is refused), optionally at least min_value."""

    def __init__(self, *, min_value=None, **options):
        ...


# ---------------------------------------------------------------------------
# Tables and models
# ---------------------------------------------------------------------------


class Table:
    """The in-memory rows of one model, keyed by primary key. Model.objects is one of these."""

    def __init__(self, model):
        ...

    def save(self, instance):
        """Insert the instance's row, or replace the row with the same primary key."""
        ...

    def get(self, pk):
        """A new instance built from the row with this primary key. LookupError if there's none."""
        ...

    def all(self):
        """New instances for every row, in the order they were first saved."""
        ...

    def filter(self, **conditions):
        """New instances for the rows whose fields equal every condition. TypeError for an unknown field."""
        ...

    def delete(self, pk):
        """Remove the row with this primary key. LookupError if there's none."""
        ...

    # __len__, __iter__ and __contains__ (by primary key) go here


class Model:
    """Base class for models. Subclasses register themselves and get their own Table."""

    registry = {}  # table name -> model class

    def __init_subclass__(cls, table=None, **kwargs):
        ...

    def __init__(self, **values):
        ...

    # pk, to_dict, __repr__, __eq__, __hash__, save and delete go here


# ---------------------------------------------------------------------------
# Anchor Tool Hire's models and sample data (given, don't change)
# ---------------------------------------------------------------------------


class Customer(Model):
    email = StringField(primary_key=True, pattern=r"[^@\s]+@[^@\s]+\.[a-z]+")
    name = StringField(max_length=40)
    tier = StringField(choices=("standard", "trade"), default="standard")


class Tool(Model):
    sku = StringField(primary_key=True, pattern=r"[A-Z]{3}-\d{2}")
    name = StringField(max_length=30)
    category = StringField(choices=("power", "garden", "access"))
    daily_rate = DecimalField(min_value=Decimal("0"))
    stock = IntegerField(min_value=0, default=1)


class Hire(Model, table="hire_log"):
    number = IntegerField(primary_key=True, min_value=1)
    customer = StringField()
    tool = StringField()
    days = IntegerField(min_value=1, max_value=28)


def load_sample():
    Customer(email="ada@example.com", name="Ada Lovelace").save()
    Customer(email="buildit@example.com", name="Build It Ltd", tier="trade").save()
    Customer(email="grace@example.com", name="Grace Hopper", tier="trade").save()

    Tool(sku="DRL-01", name="Hammer drill", category="power", daily_rate=Decimal("12.50"), stock=4).save()
    Tool(sku="SAW-02", name="Circular saw", category="power", daily_rate=Decimal("15.00"), stock=2).save()
    Tool(sku="MOW-01", name="Petrol mower", category="garden", daily_rate=Decimal("22.00")).save()
    Tool(sku="HDG-03", name="Hedge trimmer", category="garden", daily_rate=Decimal("9.75"), stock=3).save()
    Tool(sku="LAD-07", name="Extension ladder", category="access", daily_rate=8).save()

    Hire(number=1, customer="ada@example.com", tool="DRL-01", days=3).save()
    Hire(number=2, customer="buildit@example.com", tool="SAW-02", days=10).save()
    Hire(number=3, customer="grace@example.com", tool="LAD-07", days=2).save()
    Hire(number=4, customer="ada@example.com", tool="HDG-03", days=1).save()


# Each of these must be refused with ValueError, TypeError or LookupError
REFUSED = [
    lambda: Tool(sku="drl-02", name="Drill", category="power", daily_rate=Decimal("9")),
    lambda: Tool(sku="MOW-02", name="Ride-on mower", category="garden", daily_rate=35.5),
    lambda: Hire(number=5, customer="ada@example.com", tool="DRL-01", days=40),
    lambda: Customer(email="ops@anchor.example", name="Ops desk", tier="vip"),
    lambda: Customer(name="Nameless"),
    lambda: Tool(sku="LAD-08", name="Step ladder", category="access", daily_rate=5, colour="red"),
    lambda: Tool.objects.get("XYZ-99"),
    lambda: setattr(Tool.objects.get("SAW-02"), "stock", -1),
]


def main():
    load_sample()
    print("Tables:", ", ".join(sorted(Model.registry)))
    print()
    for tool in Tool.objects:
        print(tool)
    print()
    garden = Tool.objects.filter(category="garden")
    print("Garden tools:", ", ".join(tool.name for tool in garden))
    print("Trade customers:", len(Customer.objects.filter(tier="trade")))
    print("MOW-01 in Tool.objects:", "MOW-01" in Tool.objects)
    print()

    drill = Tool.objects.get("DRL-01")
    drill.stock -= 1
    print("DRL-01 stock before save:", Tool.objects.get("DRL-01").stock)
    drill.save()
    print("DRL-01 stock after save:", Tool.objects.get("DRL-01").stock)
    print()

    print(f"{'Hire':<6}{'Customer':<16}{'Tool':<18}{'Days':>4}{'Cost':>9}")
    total = Decimal("0")
    for hire in Hire.objects:
        customer = Customer.objects.get(hire.customer)
        tool = Tool.objects.get(hire.tool)
        cost = tool.daily_rate * hire.days
        total += cost
        print(f"#{hire.number:<5}{customer.name:<16}{tool.name:<18}{hire.days:>4}{cost:>9.2f}")
    print(f"{'Total':<44}{total:>9.2f}")
    print()

    for attempt in REFUSED:
        try:
            attempt()
        except (ValueError, TypeError, LookupError) as error:
            print(f"Refused: {error}")


if __name__ == "__main__":
    main()
