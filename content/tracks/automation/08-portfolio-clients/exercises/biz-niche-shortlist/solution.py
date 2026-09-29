import statistics
from decimal import Decimal


def clean(text):
    return text.strip().lower()


def niche_shortlist(records, *, min_clients=3):
    """(industry, process) pairs that come up at min_clients or more clients, most common first."""
    groups = {}
    for record in records:
        key = (clean(record["industry"]), clean(record["process"]))
        clients = groups.setdefault(key, {})
        client = clean(record["client"])
        clients[client] = max(clients.get(client, record["monthly_value"]), record["monthly_value"])
    rows = [
        {"industry": industry, "process": process, "clients": len(values),
         "median_value": statistics.median(values.values())}
        for (industry, process), values in groups.items()
        if len(values) >= min_clients
    ]
    return sorted(rows, key=lambda row: (-row["clients"], -row["median_value"], row["industry"], row["process"]))
