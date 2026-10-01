"""Acceptance tests for the tiny ORM, run by GitHub Actions in your repository.

Each test loads a fresh copy of tinyorm.py from the top of your repository, so the tables
and the registry start empty every time, then checks the fields, models and tables against
the brief.
"""

import importlib.util
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

PROGRAM = Path("tinyorm.py")

SAMPLE_RUN = r"""Tables: customers, hire_log, tools

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
"""

_loaded = 0


@pytest.fixture
def orm():
    """A fresh copy of tinyorm.py, with empty tables and its own registry."""
    global _loaded
    assert PROGRAM.exists(), "tinyorm.py should be at the top of your repository"
    _loaded += 1
    spec = importlib.util.spec_from_file_location(f"tinyorm_fresh_{_loaded}", PROGRAM)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def sample(orm):
    orm.load_sample()
    return orm


def refusal(kind, action):
    """The message of the exception action() raises, which must be a `kind`."""
    with pytest.raises(kind) as caught:
        action()
    return str(caught.value)


def test_sample_run_prints_exactly_the_output_in_the_brief():
    assert PROGRAM.exists(), "tinyorm.py should be at the top of your repository"
    result = subprocess.run([sys.executable, str(PROGRAM)], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"python tinyorm.py crashed:\n{result.stderr[-1500:]}"
    got = [line.rstrip() for line in result.stdout.splitlines()]
    assert got == SAMPLE_RUN.splitlines(), "python tinyorm.py doesn't print the sample run from the brief"


def test_importing_it_prints_nothing():
    assert PROGRAM.exists(), "tinyorm.py should be at the top of your repository"
    result = subprocess.run([sys.executable, "-c", "import tinyorm"], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"Importing tinyorm.py failed:\n{result.stderr[-1500:]}"
    assert result.stdout == "", 'Importing tinyorm.py printed something: only main() should print, under if __name__ == "__main__":'


def test_a_field_is_a_data_descriptor_storing_values_in_the_instance_dict(orm):
    class Box:
        size = orm.IntegerField(min_value=1)

    assert isinstance(Box.size, orm.IntegerField), "Reading a field on the class should return the Field itself"
    box = Box()
    with pytest.raises(AttributeError):
        box.size  # never set
    box.size = 3
    assert vars(box) == {"size": 3}, "The value should be stored in the instance's __dict__ under the field's name"
    message = refusal(ValueError, lambda: setattr(box, "size", 0))
    assert message == "Box.size: must be at least 1, got 0"
    assert box.size == 3, "A refused assignment should leave the old value in place"
    other = Box()
    other.size = 9
    assert box.size == 3, "Two instances must not share a value"


def check_refusals(orm, cases):
    """Each case is (field, bad value, message): assigning the value must raise that ValueError."""
    for field, value, message in cases:
        Thing = type("Thing", (), {"value": field})
        assert refusal(ValueError, lambda: setattr(Thing(), "value", value)) == message


def test_integer_field_refuses_bad_values_with_the_briefs_messages(orm):
    check_refusals(orm, [
        (orm.IntegerField(), True, "Thing.value: must be an int, got bool"),
        (orm.IntegerField(), "3", "Thing.value: must be an int, got str"),
        (orm.IntegerField(min_value=0), -1, "Thing.value: must be at least 0, got -1"),
        (orm.IntegerField(max_value=28), 40, "Thing.value: must be at most 28, got 40"),
    ])


def test_string_field_refuses_bad_values_with_the_briefs_messages(orm):
    check_refusals(orm, [
        (orm.StringField(), 7, "Thing.value: must be a str, got int"),
        (orm.StringField(), "   ", "Thing.value: can't be empty"),
        (orm.StringField(max_length=30), "x" * 34, "Thing.value: must be at most 30 characters, got 34"),
        (orm.StringField(pattern=r"[A-Z]{3}-\d{2}"), "drl-02", r"Thing.value: 'drl-02' doesn't match [A-Z]{3}-\d{2}"),
        (orm.StringField(pattern=r"[A-Z]{3}-\d{2}"), "DRL-012", r"Thing.value: 'DRL-012' doesn't match [A-Z]{3}-\d{2}"),
        (orm.StringField(choices=("standard", "trade")), "vip", "Thing.value: must be one of standard, trade, got 'vip'"),
    ])


def test_decimal_field_refuses_floats_and_converts_ints(sample):
    check_refusals(sample, [
        (sample.DecimalField(), 35.5, "Thing.value: must be a Decimal or int, got float"),
        (sample.DecimalField(min_value=Decimal("0")), Decimal("-1"), "Thing.value: must be at least 0, got -1"),
    ])
    tool = sample.Tool.objects.get("LAD-07")
    assert tool.daily_rate == Decimal("8") and isinstance(tool.daily_rate, Decimal), "An int daily_rate should be stored as a Decimal"
    assert isinstance(sample.Tool.daily_rate, sample.DecimalField), "Tool.daily_rate should be the DecimalField itself"
    assert vars(sample.Tool.objects.get("DRL-01"))["daily_rate"] == Decimal("12.50")


def test_models_register_themselves_with_their_table_names(orm):
    assert set(orm.Model.registry) == {"customers", "tools", "hire_log"}
    assert orm.Model.registry["tools"] is orm.Tool
    assert orm.Hire.table == "hire_log" and orm.Customer.table == "customers"
    assert list(orm.Tool._fields) == ["sku", "name", "category", "daily_rate", "stock"]
    assert orm.Tool.objects is not orm.Customer.objects, "Each model needs its own Table"

    class PowerTool(orm.Tool, table="power_tools"):
        voltage = orm.IntegerField(default=230)

    assert list(PowerTool._fields) == ["sku", "name", "category", "daily_rate", "stock", "voltage"], (
        "Inherited fields should come first, in declaration order"
    )
    assert orm.Model.registry["power_tools"] is PowerTool
    assert PowerTool.objects is not orm.Tool.objects


def test_a_model_needs_exactly_one_primary_key_and_a_free_table_name(orm):
    def no_key():
        class Van(orm.Model):
            plate = orm.StringField()

    assert refusal(TypeError, no_key) == "Van needs exactly one primary key field, found 0"

    def two_keys():
        class Van(orm.Model):
            plate = orm.StringField(primary_key=True)
            vin = orm.StringField(primary_key=True)

    assert refusal(TypeError, two_keys) == "Van needs exactly one primary key field, found 2"

    def taken():
        class Van(orm.Model, table="tools"):
            plate = orm.StringField(primary_key=True)

    with pytest.raises(TypeError):
        taken()


def test_creating_an_instance_checks_names_applies_defaults_and_validates(orm):
    tool = orm.Tool(sku="MOW-01", name="Petrol mower", category="garden", daily_rate=Decimal("22.00"))
    assert tool.stock == 1, "A field left out should get its default"
    assert orm.Customer(email="a@b.com", name="A").tier == "standard"
    assert refusal(TypeError, lambda: orm.Customer(name="Nameless")) == "Customer: missing email"
    assert (
        refusal(TypeError, lambda: orm.Tool(sku="LAD-08", name="Step ladder", category="access", daily_rate=5, colour="red"))
        == "Tool: unknown field colour"
    )
    with pytest.raises(TypeError):
        orm.Customer("a@b.com", "A")  # keyword arguments only
    with pytest.raises(ValueError):
        orm.Hire(number=5, customer="a", tool="b", days=40)


def test_pk_to_dict_repr_equality_and_hashing(sample):
    Tool = sample.Tool
    drill = Tool.objects.get("DRL-01")
    assert drill.pk == "DRL-01"
    assert sample.Hire.objects.get(2).pk == 2
    assert drill.to_dict() == {
        "sku": "DRL-01", "name": "Hammer drill", "category": "power", "daily_rate": Decimal("12.50"), "stock": 4
    }
    assert repr(drill) == "Tool(sku='DRL-01', name='Hammer drill', category='power', daily_rate=Decimal('12.50'), stock=4)"
    again = Tool.objects.get("DRL-01")
    assert drill == again and drill is not again, "get() should build a new instance that compares equal"
    assert drill != Tool.objects.get("SAW-02")
    assert drill.__eq__("DRL-01") is NotImplemented, "Comparing with something that isn't the same model should return NotImplemented"
    assert Tool.__hash__ is None, "Model instances are mutable, so __hash__ should be None"
    with pytest.raises(TypeError):
        {drill}


def test_a_table_stores_copies_until_save(sample):
    Tool = sample.Tool
    drill = Tool.objects.get("DRL-01")
    drill.stock = 0
    assert Tool.objects.get("DRL-01").stock == 4, "Editing an instance shouldn't change the table until save()"
    assert drill.save() is drill, "save() should return the instance"
    assert Tool.objects.get("DRL-01").stock == 0
    drill.stock = 2
    assert Tool.objects.get("DRL-01").stock == 0, "The table should hold a copy of the row, not the instance's values"
    assert [tool.sku for tool in Tool.objects.all()] == ["DRL-01", "SAW-02", "MOW-01", "HDG-03", "LAD-07"], (
        "Re-saving a row should keep it where it was first saved"
    )


def test_table_get_filter_and_delete(sample):
    Tool = sample.Tool
    assert refusal(LookupError, lambda: Tool.objects.get("XYZ-99")) == "no Tool with sku 'XYZ-99'"
    assert [tool.name for tool in Tool.objects.filter(category="garden")] == ["Petrol mower", "Hedge trimmer"]
    assert [tool.sku for tool in Tool.objects.filter(category="power", stock=2)] == ["SAW-02"]
    assert Tool.objects.filter(category="boat") == []
    with pytest.raises(TypeError):
        Tool.objects.filter(colour="red")
    Tool.objects.get("HDG-03").delete()
    assert len(Tool.objects) == 4 and "HDG-03" not in Tool.objects
    with pytest.raises(LookupError):
        Tool.objects.delete("HDG-03")
    Tool.objects.delete("MOW-01")
    assert len(Tool.objects) == 3


def test_tables_speak_the_container_protocol(sample):
    Tool = sample.Tool
    assert len(Tool.objects) == 5 and len(sample.Customer.objects) == 3 and len(sample.Hire.objects) == 4
    assert "MOW-01" in Tool.objects and "XYZ-99" not in Tool.objects
    rows = list(Tool.objects)
    assert [tool.sku for tool in rows] == ["DRL-01", "SAW-02", "MOW-01", "HDG-03", "LAD-07"]
    assert all(isinstance(tool, Tool) for tool in rows)
    rows[0].stock = 99
    assert Tool.objects.get("DRL-01").stock == 4, "Iterating should give new instances, not the stored rows"


def test_assignments_after_creation_are_validated_too(sample):
    hire = sample.Hire.objects.get(2)
    hire.days = 28
    assert refusal(ValueError, lambda: setattr(hire, "days", 29)) == "Hire.days: must be at most 28, got 29"
    assert hire.days == 28
    saw = sample.Tool.objects.get("SAW-02")
    assert refusal(ValueError, lambda: setattr(saw, "stock", -1)) == "Tool.stock: must be at least 0, got -1"
