from plp import test, hidden
from solution import project_summary

INVOICER = """
[project]
name = "invoicer"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = ["httpx>=0.28.1", "rich>=14.0"]
"""


@test("Summarises the invoicer project")
def _():
    assert project_summary(INVOICER) == "invoicer 0.1.0 (Python >=3.14, 2 dependencies)"


@test("Ignores other tables")
def _():
    text = """
[project]
name = "billing-api"
version = "2.3.1"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.118",
    "sqlalchemy>=2.0",
    "pydantic>=2.7,<3",
]

[dependency-groups]
dev = ["pytest>=8.4"]

[tool.ruff]
line-length = 100
"""
    assert project_summary(text) == "billing-api 2.3.1 (Python >=3.12, 3 dependencies)"


@test("Says 1 dependency, not 1 dependencies")
def _():
    text = '[project]\nname = "pinger"\nversion = "0.2.0"\nrequires-python = ">=3.13"\ndependencies = ["httpx"]\n'
    assert project_summary(text) == "pinger 0.2.0 (Python >=3.13, 1 dependency)"


@hidden("A missing dependencies key means none")
def _():
    text = '[project]\nname = "clock"\nversion = "1.0.0"\nrequires-python = ">=3.14"\n'
    assert project_summary(text) == "clock 1.0.0 (Python >=3.14, 0 dependencies)"
