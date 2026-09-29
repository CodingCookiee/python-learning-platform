import io
import zipfile

from plp import test, hidden
from solution import console_scripts


def wheel(entry_points=None, dist_info="invoicer_ada-0.2.0.dist-info"):
    """Build a small wheel in memory, with an optional entry_points.txt."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr("invoicer/__init__.py", '__version__ = "0.2.0"\n')
        zf.writestr("invoicer/cli.py", "def main():\n    return 0\n")
        zf.writestr(f"{dist_info}/METADATA", "Metadata-Version: 2.4\nName: invoicer-ada\nVersion: 0.2.0\n")
        zf.writestr(f"{dist_info}/WHEEL", "Wheel-Version: 1.0\nGenerator: uv 0.9.2\nRoot-Is-Purelib: true\nTag: py3-none-any\n")
        if entry_points is not None:
            zf.writestr(f"{dist_info}/entry_points.txt", entry_points)
        zf.writestr(f"{dist_info}/RECORD", "")
    return buffer.getvalue()


@test("Lists the wheel's commands")
def _():
    text = "[console_scripts]\ninvoicer = invoicer.cli:main\ninvoicer-admin = invoicer.admin:main\n"
    assert console_scripts(wheel(text)) == {"invoicer": "invoicer.cli:main", "invoicer-admin": "invoicer.admin:main"}


@test("A wheel without entry_points.txt installs no commands")
def _():
    assert console_scripts(wheel()) == {}


@test("Ignores other sections")
def _():
    text = (
        "[console_scripts]\nreceipts = receipts.__main__:run\n\n"
        "[gui_scripts]\nreceipts-gui = receipts.gui:main\n\n"
        "[pytest11]\nreceipts = receipts.pytest_plugin\n"
    )
    assert console_scripts(wheel(text, dist_info="receipts-1.0.0.dist-info")) == {"receipts": "receipts.__main__:run"}


@hidden("An entry_points.txt with no console_scripts section installs no commands")
def _():
    assert console_scripts(wheel("[gui_scripts]\ninvoicer-gui = invoicer.gui:main\n")) == {}


@hidden("Doesn't depend on the package's name")
def _():
    text = "[console_scripts]\nworklog = worklog.cli:main\n"
    assert console_scripts(wheel(text, dist_info="worklog_grace-0.1.0.dist-info")) == {"worklog": "worklog.cli:main"}
