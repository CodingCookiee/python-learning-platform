def revenue_by_region(conn):
    """Paid revenue per region in cents, biggest first, ties by region: [(region, revenue), ...]."""
    totals = {}
    for region, status, total_cents in conn.execute("SELECT region, status, total_cents FROM orders"):
        if status != "paid":
            continue
        totals[region] = totals.get(region, 0) + total_cents
    return sorted(totals.items(), key=lambda item: (-item[1], item[0]))
