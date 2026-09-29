from plp import test, hidden, raises
from solution import Command


def define(class_name, base, namespace):
    """Build class_name(base) with this class body, as a class statement would."""
    return type(class_name, (base,), dict(namespace))


@test("A named command is fine, a nameless one is refused")
def _():
    class Refund(Command):
        name = "refund"

    class PartialRefund(Refund):
        pass

    assert PartialRefund.name == "refund"
    with raises(TypeError, match="Broken", what="class Broken(Command): pass"):
        class Broken(Command):
            pass


@test("The name must be a non-empty string")
def _():
    raises(TypeError, define, "Blank", Command, {"name": ""}, match="Blank")
    raises(TypeError, define, "Numbered", Command, {"name": 7}, match="Numbered")


@test("Command itself still works as a plain base class")
def _():
    assert "__init_subclass__" in vars(Command)
    raises(NotImplementedError, Command().run, "hello")


@hidden("Commands with names work normally")
def _():
    class Status(Command):
        name = "status"

        def run(self, text):
            return "all systems normal"

    assert Status().run("") == "all systems normal"
    assert define("Help", Command, {"name": "help"}).name == "help"


@hidden("A subclass can't blank out an inherited name")
def _():
    Refund = define("Refund", Command, {"name": "refund"})
    raises(TypeError, define, "Muted", Refund, {"name": ""}, match="Muted")
    raises(TypeError, define, "Nothing", Refund, {"name": None}, match="Nothing")
