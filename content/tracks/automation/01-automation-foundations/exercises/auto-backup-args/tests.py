from datetime import date

from plp import hidden, test
from solution import backup_command


@test("Builds the clinic's backup command")
def _():
    assert backup_command("clinic", "/srv/backups", date(2026, 3, 9)) == [
        "pg_dump",
        "--format=custom",
        "--no-owner",
        "--file=/srv/backups/clinic-2026-03-09.dump",
        "clinic",
    ]


@test("Returns a list of strings, not one command string")
def _():
    args = backup_command("clinic", "/srv/backups", date(2026, 3, 9))
    assert isinstance(args, list)
    assert all(isinstance(arg, str) for arg in args)


@test("A folder with spaces stays in one argument")
def _():
    args = backup_command("clinic", "/srv/My Backups", date(2026, 12, 31))
    assert args[3] == "--file=/srv/My Backups/clinic-2026-12-31.dump"
    assert len(args) == 5


@hidden("Pads single-digit months and days")
def _():
    assert backup_command("shop", "/b", date(2027, 1, 5))[3] == "--file=/b/shop-2027-01-05.dump"


@hidden("The database name is the last argument, as given")
def _():
    assert backup_command("agency leads", "/b", date(2026, 3, 9))[-1] == "agency leads"
