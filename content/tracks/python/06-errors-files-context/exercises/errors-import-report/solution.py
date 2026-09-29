from collections import defaultdict
from decimal import Decimal, InvalidOperation


def import_payments(rows):
    """Total the good rows per currency, and list (row_number, reason) for each rejected row."""
    totals = defaultdict(Decimal)
    rejected = []
    for number, row in enumerate(rows, start=1):
        try:
            amount = Decimal(row["amount"])
            currency = row["currency"]
        except KeyError as error:
            rejected.append((number, f"missing {error.args[0]}"))
        except InvalidOperation:
            rejected.append((number, f"bad amount {row['amount']!r}"))
        else:
            totals[currency] += amount
    return {"totals": dict(totals), "rejected": rejected}
