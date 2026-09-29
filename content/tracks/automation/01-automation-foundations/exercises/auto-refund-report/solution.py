import csv
import io
from collections import Counter, defaultdict
from decimal import Decimal

PENNY = Decimal("0.01")
TENTH = Decimal("0.1")


def refund_report(export_text):
    """CSV text of refunds per reason (count, total, share), largest first, then a TOTAL row."""
    counts = Counter()
    totals = defaultdict(Decimal)
    for row in csv.DictReader(io.StringIO(export_text)):
        reason = (row.get("reason") or "").strip().lower()
        if not reason or row["order_id"] == "order_id":
            continue  # a blank row, or a second export's header
        counts[reason] += 1
        totals[reason] += Decimal(row["amount"])

    grand = sum(totals.values(), Decimal("0"))

    def share(amount):
        return (amount / grand * 100).quantize(TENTH) if grand else Decimal("0.0")

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(["reason", "refunds", "total", "share"])
    for reason in sorted(totals, key=lambda r: (-totals[r], r)):
        writer.writerow([reason, counts[reason], totals[reason].quantize(PENNY), share(totals[reason])])
    writer.writerow(["TOTAL", counts.total(), grand.quantize(PENNY), "100.0" if grand else "0.0"])
    return buffer.getvalue()
