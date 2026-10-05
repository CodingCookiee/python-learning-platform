"""Acceptance tests for worklog, run by GitHub Actions in your repository.

Your project is installed with `uv pip install -e .` first, so these tests run the real
package: `python -m worklog` and the `worklog` command, always with --file pointing at a
temporary log, never your ~/.worklog.jsonl. They also check pyproject.toml, and run ruff,
mypy and your own tests the way the brief's step 2 does.
"""

import json
import os
import subprocess
import sys
import sysconfig
import tomllib
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

SAMPLE = [
    ["add", "Millstone Coffee", "2.5", "--date", "2026-09-28", "--note", "Stock report fixes"],
    ["add", "Kiln Cafe", "1:15", "--date", "2026-09-29"],
    ["add", "Millstone Coffee", "3", "--date", "2026-09-30"],
    ["add", "Harbour Books", "0.75", "--date", "2026-10-02", "--note", "Call about the invoice export"],
]

SAMPLE_LIST = """\
2026-09-28  Millstone Coffee   2.50  Stock report fixes
2026-09-29  Kiln Cafe          1.25
2026-09-30  Millstone Coffee   3.00
2026-10-02  Harbour Books      0.75  Call about the invoice export
"""

SAMPLE_REPORT = """\
Week 2026-W40 (28 Sep - 4 Oct 2026)

Client              Hours
-------------------------
Millstone Coffee     5.50
Kiln Cafe            1.25
Harbour Books        0.75
-------------------------
Total                7.50
"""

SAMPLE_CSV = """\
client,hours
Millstone Coffee,5.50
Kiln Cafe,1.25
Harbour Books,0.75
"""


def clean_env(**extra):
    env = {key: value for key, value in os.environ.items() if key != "WORKLOG_FILE"}
    return {**env, "PYTHONIOENCODING": "utf-8", **extra}


def worklog(*args, log=None, env=None):
    """Run `python -m worklog [--file log] args...` and return the finished process."""
    command = [sys.executable, "-m", "worklog"]
    if log is not None:
        command += ["--file", str(log)]
    return subprocess.run(
        [*command, *args], capture_output=True, text=True, encoding="utf-8", timeout=60, env=env or clean_env()
    )


def ok(result):
    assert result.returncode == 0, (
        f"worklog exited with {result.returncode}:\n{result.stderr[-1500:]}"
    )
    return result.stdout.replace("\r\n", "\n")


@pytest.fixture
def log(tmp_path):
    return tmp_path / "log.jsonl"


@pytest.fixture
def sample_log(log):
    for args in SAMPLE:
        ok(worklog(*args, log=log))
    return log


def pyproject():
    path = Path("pyproject.toml")
    assert path.exists(), "pyproject.toml should be at the top of the repository"
    return tomllib.loads(path.read_text(encoding="utf-8"))


def run_tool(*command, timeout=180):
    return subprocess.run([sys.executable, "-m", *command], capture_output=True, text=True, timeout=timeout)


def test_version_from_python_m_and_the_installed_command():
    assert ok(worklog("--version")).strip() == "worklog 0.1.0"
    scripts = Path(sysconfig.get_path("scripts"))
    command = scripts / ("worklog.exe" if os.name == "nt" else "worklog")
    assert command.exists(), (
        "Installing the project didn't create a worklog command: add worklog = \"worklog.cli:main\" "
        "under [project.scripts]"
    )
    result = subprocess.run([str(command), "--version"], capture_output=True, text=True, timeout=60, env=clean_env())
    assert result.returncode == 0 and result.stdout.strip() == "worklog 0.1.0", (
        f"The worklog command didn't print its version:\n{result.stderr[-1000:]}"
    )


def test_pyproject_has_the_metadata_and_entry_point():
    data = pyproject()
    project = data.get("project", {})
    assert "build-system" in data, "pyproject.toml needs a [build-system] table"
    assert project.get("scripts", {}).get("worklog") == "worklog.cli:main"
    description = project.get("description", "")
    assert description and description != "Add your description here", "Write a real description"
    for key in ("readme", "requires-python", "license", "authors"):
        assert project.get(key), f"[project] needs {key}"
    assert data.get("tool", {}).get("mypy", {}).get("strict") is True, "Set strict = true under [tool.mypy]"
    assert "ruff" in data.get("tool", {}), "Configure ruff under [tool.ruff]"


def test_the_package_is_in_the_src_layout():
    for name in ("__init__.py", "__main__.py", "cli.py", "report.py", "store.py"):
        assert Path("src/worklog", name).exists(), f"src/worklog/{name} is missing"
    assert list(Path("tests").glob("test_*.py")), "Your tests should be in tests/test_*.py"


def test_add_appends_one_json_line(log):
    out = ok(worklog(*SAMPLE[0], log=log))
    assert out == "Logged 2.50 h for Millstone Coffee on 2026-09-28\n"
    assert ok(worklog("add", "Kiln Cafe", "1:15", "--date", "2026-09-29", log=log)) == (
        "Logged 1.25 h for Kiln Cafe on 2026-09-29\n"
    )
    lines = log.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2, "add should append exactly one line per entry"
    assert json.loads(lines[0]) == {
        "date": "2026-09-28", "client": "Millstone Coffee", "hours": "2.50", "note": "Stock report fixes"
    }
    second = json.loads(lines[1])
    assert second["hours"] == "1.25" and second["date"] == "2026-09-29" and second.get("note", "") == ""


def test_list_and_report_match_the_sample(sample_log):
    assert [line.rstrip() for line in ok(worklog("list", "--week", "2026-W40", log=sample_log)).splitlines()] == (
        SAMPLE_LIST.splitlines()
    )
    assert ok(worklog("list", "--week", "2026-W40", log=sample_log)) == SAMPLE_LIST, (
        "list lines shouldn't end with spaces"
    )
    assert ok(worklog("report", "--week", "2026-W40", log=sample_log)) == SAMPLE_REPORT


def test_report_as_csv_and_json(sample_log):
    assert ok(worklog("report", "--week", "2026-W40", "--format", "csv", log=sample_log)) == SAMPLE_CSV
    rows = json.loads(ok(worklog("report", "--week", "2026-W40", "--format", "json", log=sample_log)))
    assert rows == [
        {"client": "Millstone Coffee", "hours": "5.50"},
        {"client": "Kiln Cafe", "hours": "1.25"},
        {"client": "Harbour Books", "hours": "0.75"},
    ]


def test_a_week_with_no_hours(sample_log):
    assert ok(worklog("report", "--week", "2026-W41", log=sample_log)) == (
        "Week 2026-W41 (5 Oct - 11 Oct 2026)\n\nNo hours logged.\n"
    )
    assert ok(worklog("list", "--week", "2026-W39", log=sample_log)) == ""


def test_ties_and_sums_stay_exact(log):
    for client, hours in [("Beta", "0.1"), ("Beta", "0.2"), ("Alpha", "0:18"), ("Gamma", "24")]:
        ok(worklog("add", client, hours, "--date", "2026-09-28", log=log))
    assert ok(worklog("report", "--week", "2026-W40", "--format", "csv", log=log)) == (
        "client,hours\nGamma,24.00\nAlpha,0.30\nBeta,0.30\n"
    ), "Totals are exact decimals, most hours first, then by name"


def test_bad_arguments_are_usage_errors(log):
    result = worklog("add", "Kiln Cafe", "30", log=log)
    assert result.returncode == 2, "Hours over 24 should be a usage error with exit status 2"
    assert "30 isn't between 0 and 24 hours" in result.stderr
    assert "usage:" in result.stderr and result.stdout == ""
    for args in (
        ["add", "Kiln Cafe", "0"],
        ["add", "Kiln Cafe", "lots"],
        ["add", "Kiln Cafe", "2", "--date", "2026-02-30"],
        ["add", "Kiln Cafe", "2", "--date", "28/09/2026"],
        ["report", "--week", "2026-W60"],
        ["list", "--week", "2026-40"],
        ["report", "--week", "2026-W40", "--format", "xml"],
    ):
        result = worklog(*args, log=log)
        assert result.returncode == 2, f"worklog {' '.join(args)} should exit with status 2, got {result.returncode}"
        assert result.stdout == "" and "usage:" in result.stderr
    assert not log.exists() or log.read_text() == "", "A refused add must not write anything"


def test_unreadable_lines_are_skipped_with_a_warning(sample_log):
    lines = sample_log.read_text(encoding="utf-8").splitlines()
    sample_log.write_text("\n".join([lines[0], "this isn't json", *lines[1:]]) + "\n", encoding="utf-8")
    result = worklog("report", "--week", "2026-W40", log=sample_log)
    assert ok(result) == SAMPLE_REPORT, "The other entries should still be reported"
    warnings = [line for line in result.stderr.splitlines() if line.startswith("worklog: WARNING:")]
    assert warnings and "2" in warnings[0], f"Expected a 'worklog: WARNING: ...' line naming line 2, got {result.stderr!r}"
    quiet = worklog("-q", "report", "--week", "2026-W40", log=sample_log)
    assert ok(quiet) == SAMPLE_REPORT and quiet.stderr == "", "-q should hide the warning"


def test_verbose_logging_goes_to_stderr(log):
    result = worklog("-v", "add", "Kiln Cafe", "0.5", "--date", "2026-10-01", log=log)
    assert ok(result) == "Logged 0.50 h for Kiln Cafe on 2026-10-01\n", "Logging must never reach stdout"
    assert any(line.startswith("worklog: INFO: ") for line in result.stderr.splitlines()), (
        f"-v should show INFO messages as 'worklog: INFO: message' on stderr, got {result.stderr!r}"
    )
    assert worklog("add", "Kiln Cafe", "0.5", "--date", "2026-10-01", log=log).stderr == "", (
        "Without -v, a successful add should print nothing on stderr"
    )


def test_the_log_file_comes_from_worklog_file(tmp_path):
    path = tmp_path / "from-env.jsonl"
    result = worklog("add", "Harbour Books", "1", "--date", "2026-09-28", env=clean_env(WORKLOG_FILE=str(path)))
    ok(result)
    assert path.exists(), "With WORKLOG_FILE set and no --file, add should write to that file"
    code = (
        "import sys; from worklog.cli import main; "
        "print('returned', repr(main(['--file', sys.argv[1], 'report', '--week', '2026-W40', '--format', 'csv'])))"
    )
    called = subprocess.run([sys.executable, "-c", code, str(path)], capture_output=True, text=True, timeout=60, env=clean_env())
    assert called.returncode == 0, called.stderr[-1500:]
    assert called.stdout.replace("\r\n", "\n").endswith("Harbour Books,1.00\nreturned 0\n"), "main(argv) should return 0"


def test_ruff_and_mypy_pass(tmp_path):
    for command in (["ruff", "check", ".", "--extend-exclude", ".pylearn"],
                    ["ruff", "format", "--check", ".", "--extend-exclude", ".pylearn"]):
        result = run_tool(*command)
        assert result.returncode == 0, f"{' '.join(command[:2])} failed:\n{result.stdout[-2000:]}{result.stderr[-500:]}"
    result = run_tool("mypy", "--cache-dir", str(tmp_path / "mypy"))
    assert result.returncode == 0, f"mypy (with the [tool.mypy] settings) failed:\n{result.stdout[-2000:]}{result.stderr[-500:]}"


def test_your_own_tests_pass(tmp_path):
    report = tmp_path / "report.xml"
    result = run_tool("pytest", "tests", "-q", "-p", "no:cacheprovider", f"--junitxml={report}")
    assert report.exists(), f"Your tests didn't run:\n{result.stdout[-1500:]}{result.stderr[-1500:]}"
    cases = list(ET.parse(report).getroot().iter("testcase"))
    failed = [c.get("name") for c in cases if c.find("failure") is not None or c.find("error") is not None]
    assert cases and not failed, f"These tests in tests/ fail: {failed[:5]}\n{result.stdout[-1500:]}"
