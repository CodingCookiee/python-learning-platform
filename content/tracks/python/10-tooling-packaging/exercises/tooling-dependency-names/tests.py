from plp import test, hidden
from solution import dependency_names

INVOICER = """
[project]
name = "invoicer"
version = "0.1.0"
dependencies = [
    "httpx>=0.28.1",
    "Pydantic[email]>=2.7,<3",
    "python_dateutil==2.9.0.post0",
    "tzdata; sys_platform == 'win32'",
    "rich ~= 14.0",
]
"""


def pyproject(*dependencies):
    listed = ", ".join(f'"{dependency}"' for dependency in dependencies)
    return f'[project]\nname = "demo"\nversion = "1.0.0"\ndependencies = [{listed}]\n'


@test("Handles extras, markers, spaces and every operator")
def _():
    assert dependency_names(INVOICER) == ["httpx", "pydantic", "python-dateutil", "rich", "tzdata"]


@test("Works with any operator, or none")
def _():
    assert dependency_names(pyproject("click==8.3.0", "jinja2<4", "markdown-it-py", "rich!=14.0.0")) == [
        "click",
        "jinja2",
        "markdown-it-py",
        "rich",
    ]


@test("Normalises -, _ and . runs, and drops duplicates")
def _():
    assert dependency_names(pyproject("Python_Dateutil>=2.9", "python.dateutil", "ruamel.yaml>=0.18", "zope__interface")) == [
        "python-dateutil",
        "ruamel-yaml",
        "zope-interface",
    ]


@hidden("A project without dependencies has none")
def _():
    assert dependency_names('[project]\nname = "clock"\nversion = "1.0.0"\n') == []


@hidden("Handles leading spaces and extras with spaces")
def _():
    assert dependency_names(pyproject("  uvicorn [standard] >=0.37", "SQLAlchemy[asyncio]")) == ["sqlalchemy", "uvicorn"]
