---
slug: composition-and-plain-data
title: Composition, and when not to write a class
summary: Build objects from parts instead of deep hierarchies, and know when a function, a dict or a dataclass is the better design.
minutes: 30
exercises:
  - oop-class-to-function
  - oop-order-service-composition
  - oop-report-formats-refactor
---

You now know enough object-oriented Python to over-engineer anything. This last lesson is about
restraint: building classes out of smaller parts instead of long inheritance chains, and
recognising when you don't need a class at all.

## When inheritance explodes

A report can be written as CSV or as JSON, and delivered by email or saved to a file. Model each
combination with inheritance and you get a class per combination:

```python
class Report:
    def __init__(self, rows):
        self.rows = rows

class CsvReport(Report):
    def render(self):
        return "\n".join(",".join(str(value) for value in row) for row in self.rows)

class EmailedCsvReport(CsvReport):
    def publish(self):
        return f"emailed {len(self.render())} bytes"

class SavedCsvReport(CsvReport):
    def publish(self):
        return f"saved {len(self.render())} bytes"

# ...and JsonReport, EmailedJsonReport, SavedJsonReport. Add PDF and Slack: nine classes.
EmailedCsvReport([["sku", "qty"], ["MUG-01", 3]]).publish()
```

Two independent choices (format and delivery) multiplied into a class for every pair. The fix is
to stop asking "what kind of report is this?" and ask "what parts does a report have?"

## Composition: has-a instead of is-a

With **composition**, an object holds other objects and hands work to them. A report **has a**
formatter and **has a** delivery method, each a small object that does one thing:

```python
import json

class CsvFormat:
    def render(self, rows):
        return "\n".join(",".join(str(value) for value in row) for row in rows)

class JsonFormat:
    def render(self, rows):
        return json.dumps(rows)

class EmailDelivery:
    def __init__(self, to):
        self.to = to

    def send(self, text):
        return f"emailed {len(text)} bytes to {self.to}"

class Report:
    def __init__(self, rows, formatter, delivery):
        self.rows = rows
        self.formatter = formatter
        self.delivery = delivery

    def publish(self):
        return self.delivery.send(self.formatter.render(self.rows))

rows = [["sku", "qty"], ["MUG-01", 3]]
as_csv = Report(rows, CsvFormat(), EmailDelivery("ops@example.com")).publish()
as_json = Report(rows, JsonFormat(), EmailDelivery("ops@example.com")).publish()
as_csv, as_json
```

Each new format or delivery is one new small class, and any combination works without anyone
writing a class for it. Use inheritance when one thing truly **is a** more specific kind of another
(an admin is a user) and shares most of its behaviour. Use composition when an object **has** parts
that vary independently.

## Swapping parts makes testing easy

Because `Report` only calls `self.delivery.send(...)`, anything with a `send` method will do. That
includes a fake that records what it was given instead of emailing anybody:

```python
class RecordingDelivery:
    def __init__(self):
        self.sent = []

    def send(self, text):
        self.sent.append(text)
        return "recorded"

class UpperFormat:
    def render(self, rows):
        return str(rows).upper()

class Report:
    def __init__(self, rows, formatter, delivery):
        self.rows = rows
        self.formatter = formatter
        self.delivery = delivery

    def publish(self):
        return self.delivery.send(self.formatter.render(self.rows))

fake = RecordingDelivery()
Report([["mug", 3]], UpperFormat(), fake).publish()
fake.sent
```

No base class was needed: Python only cares that the object has the method you call. This is
**duck typing** ("if it quacks like a duck..."). An abstract base class, as in lesson 5, is an
optional way to write the requirement down; module 9's `Protocol` is another.

```quiz
question: "An `Invoice` needs to calculate tax differently per country. Which design scales best?"
options:
  - "A subclass per country: UkInvoice, DeInvoice, FrInvoice..."
  - "An Invoice that holds a tax rule object (or function) for its country"
  - "One Invoice class with an if/elif chain over every country"
answer: 1
explain: The tax rule is a part that varies independently of everything else about an invoice. Composition lets you add a country by adding one rule, without touching Invoice or multiplying subclasses.
```

## When a function beats a class

A class with an `__init__` that stores arguments and a single method that uses them is a function
in disguise:

```python
class ShippingCalculator:
    def __init__(self, rate_per_kg):
        self.rate_per_kg = rate_per_kg

    def calculate(self, weight_kg):
        return round(weight_kg * self.rate_per_kg, 2)

ShippingCalculator(4.5).calculate(2.2)
```

The caller has to build an object just to call one method on it. A function says the same thing
with less ceremony:

```python
def shipping_cost(weight_kg, rate_per_kg):
    return round(weight_kg * rate_per_kg, 2)

shipping_cost(2.2, 4.5)
```

If you need to fix the rate in advance, `functools.partial(shipping_cost, rate_per_kg=4.5)` or a
closure (module 3) does that too. A small part like a formatter can also just be a function: pass
`render_csv` instead of `CsvFormat()`. Write a class when you have **state that changes over time**
plus **several operations** on it, like a bank account or a cart. Not before.

## When a dict or a dataclass beats a class

Data without behaviour doesn't need a hand-written class either:

| You have | Use |
|----------|-----|
| Keys you don't know in advance: counts per SKU, settings loaded from JSON | a `dict` (or `Counter`, `defaultdict`) |
| A fixed record with named fields, maybe a method or two | a `@dataclass` |
| A small, fixed, immutable record | a frozen dataclass or a `namedtuple` |
| State that changes, with rules about how | a class with methods (maybe a dataclass too) |

```python
from collections import Counter

movements = [("MUG-01", 5), ("LAMP-02", 2), ("MUG-01", -3)]

stock = Counter()
for sku, change in movements:
    stock[sku] += change

stock
```

A `StockLevels` class wrapping that `Counter` would add a name and nothing else. The capstone for
this module puts all of this together: dataclasses for the records, one class for the part with
real rules, and plain functions for the reports.

## Where this leaves you

Prefer composition when parts vary independently: hold objects and delegate to them, and any
object with the right methods can be swapped in, including fakes in tests. Keep inheritance for
genuine "is a kind of" relationships. And before writing a class, check whether a function, a dict
or a dataclass already says it more simply.
