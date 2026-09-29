SORT_COLUMNS = {
    "number": "number",
    "customer": "customer",
    "amount": "amount_cents",
    "issued_on": "issued_on",
}


def list_invoices(conn, sort="issued_on", descending=False, status=None):
    """Invoice numbers sorted by sort (number, customer, amount or issued_on), ties by number,
    optionally only those with this status. ValueError for any other sort."""
    if sort not in SORT_COLUMNS:
        raise ValueError(f"Can't sort by {sort!r}; choose from {', '.join(SORT_COLUMNS)}")
    direction = "DESC" if descending else "ASC"
    where, params = "", ()
    if status is not None:
        where, params = "WHERE status = ?", (status,)
    sql = f"SELECT number FROM invoices {where} ORDER BY {SORT_COLUMNS[sort]} {direction}, number"
    return [row[0] for row in conn.execute(sql, params)]
