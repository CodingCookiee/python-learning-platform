from abc import ABC, abstractmethod

from plp import test, hidden, raises
import solution
from solution import Plugin, get_plugin, plugin_names


@test("An abstract base mixing in ABC now works, and plugins still register")
def _():
    class TabularPlugin(Plugin, ABC):
        @abstractmethod
        def columns(self):
            ...

        def run(self, rows):
            return [dict(zip(self.columns(), row)) for row in rows]

    class InvoiceTable(TabularPlugin):
        name = "invoice-table"

        def columns(self):
            return ["number", "total"]

    assert get_plugin("invoice-table").run([("INV-1", 120)]) == [{"number": "INV-1", "total": 120}]
    assert "invoice-table" in plugin_names()
    raises(TypeError, TabularPlugin)


@test("No metaclass is left")
def _():
    assert type(Plugin) is type
    metaclasses = [name for name, value in vars(solution).items() if isinstance(value, type) and issubclass(value, type)]
    assert metaclasses == [], "Delete the metaclass once __init_subclass__ does its job"


@test("Registers named plugins and returns new instances")
def _():
    class Summary(Plugin):
        name = "summary"

        def run(self, rows):
            return f"{len(rows)} rows"

    first, second = get_plugin("summary"), get_plugin("summary")
    assert isinstance(first, Summary)
    assert first is not second
    assert first.run([1, 2, 3]) == "3 rows"


@hidden("A duplicate name is refused when the class is defined")
def _():
    class Totals(Plugin):
        name = "totals"

    with raises(TypeError, match="totals", what="class MoreTotals(Plugin): name = 'totals'"):
        class MoreTotals(Plugin):
            name = "totals"

    assert type(get_plugin("totals")) is Totals


@hidden("Only a class's own name registers it")
def _():
    class Chart(Plugin):
        name = "chart"

    class ColourChart(Chart):
        pass

    class BarChart(Chart):
        name = "bar-chart"

    assert type(get_plugin("chart")) is Chart
    assert type(get_plugin("bar-chart")) is BarChart
    registered = {type(get_plugin(name)) for name in plugin_names()}
    assert ColourChart not in registered
