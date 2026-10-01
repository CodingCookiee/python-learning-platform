Anchor Tool Hire rents drills, mowers and ladders to householders and builders. Its booking code
started as dicts passed around between functions, and every week something slips through: a
negative stock count, a tool code typed in lower case, a hire for 40 days when the maximum is 28.
They want their records to validate themselves, with one place that declares what a customer, a
tool and a hire are, and they'll move to a real database later.

You'll build the core of an **ORM** (object-relational mapper) for them, in one module,
`tinyorm.py`. It's the same design Django's models and SQLAlchemy's declarative classes use,
made small enough to write in an afternoon, and it uses most of this module: descriptors with
`__set_name__` for the fields, `__init_subclass__` to register each model, the container protocol
for the tables, and `__repr__`, `__eq__` and `__hash__` done by the rules. Build it in your own
editor. The starter contains Anchor's three models, the sample data and a `main()` that prints
everything below once your classes work.

## A sample run

```text
$ python tinyorm.py
Tables: customers, hire_log, tools

Tool(sku='DRL-01', name='Hammer drill', category='power', daily_rate=Decimal('12.50'), stock=4)
Tool(sku='SAW-02', name='Circular saw', category='power', daily_rate=Decimal('15.00'), stock=2)
Tool(sku='MOW-01', name='Petrol mower', category='garden', daily_rate=Decimal('22.00'), stock=1)
Tool(sku='HDG-03', name='Hedge trimmer', category='garden', daily_rate=Decimal('9.75'), stock=3)
Tool(sku='LAD-07', name='Extension ladder', category='access', daily_rate=Decimal('8'), stock=1)

Garden tools: Petrol mower, Hedge trimmer
Trade customers: 2
MOW-01 in Tool.objects: True

DRL-01 stock before save: 4
DRL-01 stock after save: 3

Hire  Customer        Tool              Days     Cost
#1    Ada Lovelace    Hammer drill         3    37.50
#2    Build It Ltd    Circular saw        10   150.00
#3    Grace Hopper    Extension ladder     2    16.00
#4    Ada Lovelace    Hedge trimmer        1     9.75
Total                                          213.25

Refused: Tool.sku: 'drl-02' doesn't match [A-Z]{3}-\d{2}
Refused: Tool.daily_rate: must be a Decimal or int, got float
Refused: Hire.days: must be at most 28, got 40
Refused: Customer.tier: must be one of standard, trade, got 'vip'
Refused: Customer: missing email
Refused: Tool: unknown field colour
Refused: no Tool with sku 'XYZ-99'
Refused: Tool.stock: must be at least 0, got -1
```

The blocks are: the registered tables, every tool, two queries and a membership check, an edit
that only reaches the table when it's saved, a hire report joined across three tables, and eight
operations your ORM must refuse.

## The design

Here's one of the models, exactly as it appears in the starter. Everything you write exists to
make these six lines work:

```python norun
class Tool(Model):
    sku = StringField(primary_key=True, pattern=r"[A-Z]{3}-\d{2}")
    name = StringField(max_length=30)
    category = StringField(choices=("power", "garden", "access"))
    daily_rate = DecimalField(min_value=Decimal("0"))
    stock = IntegerField(min_value=0, default=1)
```

| Piece | Mechanism | Job |
|-------|-----------|-----|
| `Field` | data descriptor | Stores one value per instance, and validates every assignment |
| `IntegerField`, `StringField`, `DecimalField` | `Field` subclasses | The rules for each kind of value |
| `Model` | base class with `__init_subclass__` | Collects a model's fields, checks its primary key, registers it and gives it a table |
| `Table` | container protocol | A model's saved rows: `Tool.objects` |

Two decisions are already made for you:

- **Validation belongs to the fields.** No model class contains an `if`. Because a `Field` is a
  data descriptor, `tool.stock = -1` goes through its `__set__` whether it happens in `__init__` or
  a week later, so an invalid value can never be stored.
- **A table stores rows, not objects.** `save()` copies the instance's values into the table, and
  `get()` builds a new instance from them. Editing an instance changes nothing until it's saved,
  exactly like a real database, which is what the "before save" line in the sample shows.

## Requirements

### Fields

`Field(*, primary_key=False, default=MISSING)` is the base descriptor.

- `__set_name__(owner, name)` records the attribute's name and the model's name, for messages.
- `__get__` returns the `Field` itself when read on the class (`Tool.daily_rate`), and the stored
  value when read on an instance. Reading a value that was never set raises `AttributeError`.
- `__set__` calls `self.validate(value)` and stores what it returns in the instance's `__dict__`
  under the field's name.
- `validate(value)` returns the value to store or raises `ValueError`. Every message starts with
  `Model.field: `, as in the sample run.

`MISSING`, a unique object defined in the starter, means "no default", so that `None` can still be
a real default. The three field types add these checks, in this order:

| Field | Accepts | Options, each optional |
|-------|---------|------------------------|
| `IntegerField` | an `int`, never a `bool`: `must be an int, got bool` | `min_value`: `must be at least 0, got -1`; `max_value`: `must be at most 28, got 40` |
| `StringField` | a `str` that isn't empty or only spaces: `must be a str, got int`, `can't be empty` | `max_length`: `must be at most 30 characters, got 34`; `pattern`, a regex the whole string must match (`re.fullmatch`): `'drl-02' doesn't match [A-Z]{3}-\d{2}`; `choices`: `must be one of standard, trade, got 'vip'` |
| `DecimalField` | a `Decimal`, or an `int` (converted to `Decimal`). A float is refused, because money in floats is how pennies go missing: `must be a Decimal or int, got float` | `min_value`: `must be at least 0, got -1` |

### Models

Every subclass of `Model` is set up by `Model.__init_subclass__(cls, table=None, **kwargs)`:

- It collects the model's fields into `cls._fields`, a dict of name to `Field` in declaration
  order, with fields inherited from a parent model first.
- Exactly one field must have `primary_key=True`, or it raises `TypeError` when the class is
  defined: `Tool needs exactly one primary key field, found 0`.
- The table name is the `table=` class keyword (`class Hire(Model, table="hire_log")`), or the
  class name lower-cased plus `s`. It's stored as `cls.table`, and the model is registered in
  `Model.registry` under it. A second model with the same table name raises `TypeError`.
- The model gets its own `Table`, as `cls.objects`.

Instances:

| Member | Does |
|--------|------|
| `Model(**values)` | Keyword arguments only. An unknown name raises `TypeError` (`Tool: unknown field colour`) before anything is set; then each field in order is set from `values`, from its default, or raises `TypeError` (`Customer: missing email`) |
| `pk` | The value of the primary key field |
| `to_dict()` | The field values as a new dict, in field order |
| `repr()` | `Tool(sku='DRL-01', name='Hammer drill', ...)`: every field, with `repr()` values |
| `==` | `True` for the same model class with equal field values. Anything else returns `NotImplemented` |
| `hash()` | Refused: instances are mutable, so `__hash__` is `None` (lesson 1) |
| `save()` | Saves the row into the model's table and returns the instance |
| `delete()` | Removes the instance's row from its table |

### Tables

`Table(model)` holds one model's rows: a dict of primary key to a *copy* of the row's values.

| Member | Does |
|--------|------|
| `save(instance)` | Inserts the row, or replaces the row with the same primary key |
| `get(pk)` | A new instance built from that row. `LookupError` if there's none: `no Tool with sku 'XYZ-99'` |
| `all()` | New instances for every row, in the order rows were first saved |
| `filter(**conditions)` | New instances for the rows where every named field equals its value. An unknown field name raises `TypeError` |
| `delete(pk)` | Removes that row, or raises `LookupError` |
| `len(table)`, `for row in table`, `pk in table` | The number of rows, new instances in order, and whether a primary key is saved |

## Getting started

1. Copy the starter into `tinyorm.py`. Until the classes work, running it fails partway through
   `main()`; that's expected.
2. Write `Field` and `IntegerField` first and try them on a throwaway class in the REPL:
   `class Box: size = IntegerField(min_value=1)`, then `box = Box(); box.size = 0` should raise,
   and `vars(box)` should show the value after a good assignment.
3. Add `StringField` and `DecimalField`, then `Model.__init_subclass__` and `Model.__init__`. At
   this point `Tool(...)` builds and validates, and `Model.registry` fills in as the module loads.
4. Add `Table`, then `save`, `pk` and `to_dict`, then `__repr__` and `__eq__`. Run
   `python tinyorm.py` and compare the output with the sample line by line.

### Things the lessons didn't cover

- **A sentinel default.** `MISSING = object()` is a value nothing else can be equal to, so
  `field.default is MISSING` asks "was a default given?" even when the default is `None`.
- **The order of checks.** Each field class checks the type first and then its options, in the
  order of the table above, so a value with several problems reports the same one as the sample.
  A small `fail(problem)` helper on `Field` that raises `ValueError(f"{model}.{name}: {problem}")`
  keeps the messages consistent.
- **Walking the MRO for fields.** `for klass in reversed(cls.__mro__)` visits `object` first and
  the model itself last, so a subclass's field replaces an inherited one with the same name.

## Try these

Before you submit, check each of these in the REPL after `load_sample()`:

- `Tool.daily_rate` is a `DecimalField`, and `vars(Tool.objects.get("DRL-01"))` holds the values
  under the field names.
- `Tool.objects.get("DRL-01") == Tool.objects.get("DRL-01")` is `True`, but the two are not the
  same object (`is` is `False`), and `{Tool.objects.get("DRL-01")}` raises `TypeError`.
- A tool with `daily_rate=8` is stored as `Decimal('8')`, and `Tool.objects.filter(category="boat")`
  returns `[]`, while `Tool.objects.filter(colour="red")` raises `TypeError`.
- `class Van(Model): plate = StringField()` raises `TypeError`: no primary key. So does
  `class Van(Model, table="tools"): ...` with a primary key, because that table is taken.
- `Tool.objects.get("HDG-03").delete()` leaves `len(Tool.objects)` at 4, and `"HDG-03" in
  Tool.objects` is `False`.
- `Hire.objects.get(2).days = 28` works and `= 29` doesn't, and a refused assignment leaves the
  old value in place.

## Stretch goals

Pick any you like once the requirements work:

- **Lookups.** `filter(daily_rate__lt=10, category="garden")`: a double underscore adds an
  operator (`lt`, `lte`, `gt`, `gte`, `in`, `contains`), as in Django.
- **References.** A `Reference("customers")` field that refuses a value unless that primary key
  exists in the named table, found through `Model.registry`, so a hire can't point at a customer
  who isn't there.
- **Abstract models.** `class Timestamped(Model, abstract=True)` declares shared fields, such as a
  `created` date, without being registered or needing a primary key; its subclasses inherit them.
- **Persistence.** `Model.dump(path)` and `Model.load(path)` write and read every table as JSON,
  converting `Decimal` to and from strings.
- **A metaclass, on purpose.** Make `len(Tool)`, `"DRL-01" in Tool` and `Tool["DRL-01"]` work on
  the class itself. That needs a metaclass (lesson 5); say in your README whether it was worth it
  compared with `Tool.objects`.
- **Tests.** Write `test_tinyorm.py` with pytest, using a fixture that clears every table between
  tests, and cover every refusal in the sample run.

## How it's tested

Automated tests run on every push to your repository. They rely on this:

- `tinyorm.py` is at the top of the repository, with the starter's models, `load_sample()` and
  `main()` unchanged. `python tinyorm.py` prints the sample run exactly (spaces at the ends of lines
  aside), and importing it prints nothing.
- Each test loads a fresh copy of `tinyorm.py`, so the tables and `Model.registry` start empty. The
  tests also define small classes and models of their own, such as a `Thing` class with one field,
  and compare the refusal messages word for word with the tables above.
- A model with two primary key fields is refused like one with none:
  `Van needs exactly one primary key field, found 2`.

## How to submit

Push `tinyorm.py` and a short `README.md` (what it does, how to run it, and one paragraph on how a
field's value gets from `tool.stock = 3` into storage) to a GitHub repository. Connect the
repository on this capstone's page and add the workflow file it gives you
(`.github/workflows/pylearn.yml`): the tests then run on every push, and the page shows the results.
The review runs hidden tests against the fields, models and tables, runs `python tinyorm.py` and
compares it with the sample, then reads your code against the criteria: validation in the fields
only, values in each instance's `__dict__`, registration in `__init_subclass__` with no metaclass,
tables that store copies and speak the container protocol, and equality and hashing done by the
rules.
