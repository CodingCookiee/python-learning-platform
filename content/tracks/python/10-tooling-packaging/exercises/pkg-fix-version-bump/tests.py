from plp import test, hidden, raises
from solution import bump_version

MONOREPO = """[project]
name = "invoicer"
version = "1.4.7"   # bumped by the release script
dependencies = ["invoicer-core==1.4.7", "httpx>=0.28"]

[tool.docs]
version = "1.4.7"
"""


def with_version(new):
    return MONOREPO.replace('version = "1.4.7"   #', f'version = "{new}"   #')


@test("A minor bump resets the patch, and changes nothing else")
def _():
    assert bump_version(MONOREPO, "minor") == with_version("1.5.0")


@test("Major and patch bumps")
def _():
    assert bump_version(MONOREPO, "major") == with_version("2.0.0")
    assert bump_version(MONOREPO, "patch") == with_version("1.4.8")


@test("Leaves other tables alone, even when they come first")
def _():
    text = '[tool.docs]\nversion = "0.9.0"\n\n[project]\nname = "receipts"\nversion = "0.9.0"\n'
    assert bump_version(text, "minor") == '[tool.docs]\nversion = "0.9.0"\n\n[project]\nname = "receipts"\nversion = "0.10.0"\n'


@hidden("Refuses an unknown part")
def _():
    raises(ValueError, bump_version, MONOREPO, "micro")


@hidden("Keeps spacing and a file without a final newline")
def _():
    text = '# Invoicer\n[project]\nname="invoicer"\nversion="3.0.9"'
    assert bump_version(text, "patch") == '# Invoicer\n[project]\nname="invoicer"\nversion="3.0.10"'
