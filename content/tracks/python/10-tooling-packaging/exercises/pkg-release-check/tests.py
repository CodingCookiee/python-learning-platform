from plp import test, hidden
from solution import release_problems

EXAMPLE = """
[project]
name = "worklog-ada"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"

[project.scripts]
worklog = "worklog.cli:main"
"""

READY = """
[project]
name = "worklog-ada"
version = "0.2.0"
description = "Log hours against clients and report them by week."
readme = "README.md"
requires-python = ">=3.12"
license = "MIT"
dependencies = []

[project.scripts]
worklog = "worklog.cli:main"

[build-system]
requires = ["uv_build>=0.9.2,<0.10.0"]
build-backend = "uv_build"
"""


def with_version(version):
    return READY.replace('version = "0.2.0"', f'version = "{version}"')


@test("Finds the four problems in the example")
def _():
    assert release_problems(EXAMPLE, "v0.1.0", ["0.1.0"]) == [
        "missing project.license",
        "description is still the uv placeholder",
        "version 0.1.0 is already on PyPI",
        "no [build-system] table",
    ]


@test("A ready project has no problems")
def _():
    assert release_problems(READY, "v0.2.0", ["0.1.0", "0.1.1"]) == []
    assert release_problems(READY, "v0.2.0", []) == []


@test("The version must be newer than everything published, compared as numbers")
def _():
    assert release_problems(with_version("0.9.0"), "v0.9.0", ["0.1.0", "0.10.0", "0.2.0"]) == [
        "version 0.9.0 isn't newer than 0.10.0"
    ]
    assert release_problems(with_version("0.10.1"), "v0.10.1", ["0.9.0", "0.10.0"]) == []


@test("The tag must match the version")
def _():
    assert release_problems(READY, "0.2.0", ["0.1.0"]) == ["tag 0.2.0 doesn't match version 0.2.0"]
    assert release_problems(READY, "v0.2", ["0.1.0"]) == ["tag v0.2 doesn't match version 0.2.0"]


@hidden("A malformed version skips the checks that need one")
def _():
    assert release_problems(with_version("0.2"), "v0.2", ["0.1.0"]) == ["version 0.2 isn't MAJOR.MINOR.PATCH"]


@hidden("Reports every missing field, in order, and a missing version skips the version checks")
def _():
    text = '[project]\nname = "worklog-ada"\n\n[project.scripts]\nworklog = "worklog.cli:main"\n\n[build-system]\nrequires = ["uv_build"]\n'
    assert release_problems(text, "v1.0.0", ["1.0.0"]) == [
        "missing project.version",
        "missing project.description",
        "missing project.readme",
        "missing project.requires-python",
        "missing project.license",
    ]


@hidden("Needs an entry point")
def _():
    text = READY.replace('[project.scripts]\nworklog = "worklog.cli:main"\n', "")
    assert release_problems(text, "v0.2.0", []) == ["no [project.scripts] entry point"]
