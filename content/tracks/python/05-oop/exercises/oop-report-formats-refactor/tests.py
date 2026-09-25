import inspect
import json

from plp import test, hidden
import solution

ROWS = [{"sku": "MUG-01", "qty": 3}, {"sku": "LAMP-02", "qty": 0}]
CSV_TEXT = "sku,qty\nMUG-01,3\nLAMP-02,0"


def publish(report):
    outbox = []
    report.publish(outbox)
    return outbox


@test("Emails CSV and archives JSON as before")
def _():
    outbox = []
    solution.Report("Low stock", ROWS, solution.CsvFormat(), solution.EmailDelivery("ops@example.com")).publish(outbox)
    solution.Report("Low stock", ROWS, solution.JsonFormat(), solution.ArchiveDelivery("reports/2026-09")).publish(outbox)
    assert outbox == [
        ("email", "ops@example.com", "low-stock.csv", CSV_TEXT),
        ("archive", "reports/2026-09/low-stock.json", json.dumps({"title": "Low stock", "rows": ROWS})),
    ]


@test("The other two combinations work too")
def _():
    emailed = publish(
        solution.Report("Weekly sales", ROWS, solution.JsonFormat(), solution.EmailDelivery("ceo@example.com"))
    )
    archived = publish(solution.Report("Weekly sales", ROWS, solution.CsvFormat(), solution.ArchiveDelivery("archive")))
    assert emailed == [
        ("email", "ceo@example.com", "weekly-sales.json", json.dumps({"title": "Weekly sales", "rows": ROWS}))
    ]
    assert archived == [("archive", "archive/weekly-sales.csv", CSV_TEXT)]


@test("No class inherits from another, and the old classes are gone")
def _():
    classes = {
        name: cls for name, cls in vars(solution).items() if inspect.isclass(cls) and cls.__module__ == "solution"
    }
    inheriting = sorted(name for name, cls in classes.items() if cls.__bases__ != (object,))
    assert inheriting == [], f"These classes still inherit: {', '.join(inheriting)}"
    old = {"CsvReport", "JsonReport", "EmailedCsvReport", "EmailedJsonReport", "ArchivedCsvReport", "ArchivedJsonReport"}
    leftovers = sorted(old & set(classes))
    assert leftovers == [], f"Remove the old classes: {', '.join(leftovers)}"


@hidden("Accepts a new format without any changes")
def _():
    class MarkdownFormat:
        extension = "md"

        def render(self, title, rows):
            return f"# {title}\n" + "\n".join(f"- {row['sku']}: {row['qty']}" for row in rows)

    outbox = publish(solution.Report("Low stock", ROWS, MarkdownFormat(), solution.EmailDelivery("ops@example.com")))
    assert outbox == [("email", "ops@example.com", "low-stock.md", "# Low stock\n- MUG-01: 3\n- LAMP-02: 0")]


@hidden("Accepts a new delivery without any changes")
def _():
    class SlackDelivery:
        def deliver(self, filename, text, outbox):
            outbox.append(("slack", "#ops", filename, len(text)))

    outbox = publish(solution.Report("Low stock", ROWS, solution.CsvFormat(), SlackDelivery()))
    assert outbox == [("slack", "#ops", "low-stock.csv", len(CSV_TEXT))]


@hidden("An empty CSV report renders as empty text")
def _():
    outbox = publish(solution.Report("Nothing to see", [], solution.CsvFormat(), solution.ArchiveDelivery("tmp")))
    assert outbox == [("archive", "tmp/nothing-to-see.csv", "")]
