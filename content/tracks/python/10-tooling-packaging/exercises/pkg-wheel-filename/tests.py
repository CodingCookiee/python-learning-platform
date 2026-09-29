from plp import test, hidden, raises
from solution import parse_wheel_filename


@test("Reads a pure-Python wheel")
def _():
    assert parse_wheel_filename("invoicer_ada-0.1.0-py3-none-any.whl") == {
        "name": "invoicer_ada",
        "version": "0.1.0",
        "python": "py3",
        "abi": "none",
        "platform": "any",
    }


@test("Reads a compiled wheel")
def _():
    assert parse_wheel_filename("numpy-2.3.3-cp314-cp314-win_amd64.whl") == {
        "name": "numpy",
        "version": "2.3.3",
        "python": "cp314",
        "abi": "cp314",
        "platform": "win_amd64",
    }


@test("Keeps compound platform tags whole")
def _():
    assert parse_wheel_filename(
        "pydantic_core-2.41.1-cp314-cp314-manylinux_2_17_x86_64.manylinux2014_x86_64.whl"
    )["platform"] == "manylinux_2_17_x86_64.manylinux2014_x86_64"


@hidden("Refuses files that aren't wheels")
def _():
    raises(ValueError, parse_wheel_filename, "invoicer_ada-0.1.0.tar.gz")
    raises(ValueError, parse_wheel_filename, "invoicer-ada-0.1.0-py3-none-any.whl")
    raises(ValueError, parse_wheel_filename, "invoicer_ada-0.1.0.whl")
