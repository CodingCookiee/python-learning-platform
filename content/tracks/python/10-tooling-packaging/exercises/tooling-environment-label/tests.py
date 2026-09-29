from plp import test, hidden
from solution import environment_label


@test("Recognises a virtual environment")
def _():
    assert environment_label("/home/ada/invoicer/.venv", "/usr") == "virtual environment at /home/ada/invoicer/.venv"


@test("Recognises the system Python")
def _():
    assert environment_label("/usr", "/usr") == "system Python at /usr"


@test("Works with Windows paths")
def _():
    assert (
        environment_label(r"C:\Users\ada\invoicer\.venv", r"C:\Python314")
        == r"virtual environment at C:\Users\ada\invoicer\.venv"
    )


@hidden("Describes this browser's Python correctly")
def _():
    import sys

    assert environment_label(sys.prefix, sys.base_prefix) == f"system Python at {sys.prefix}"
