def list_invoices(conn, sort="issued_on", descending=False, status=None):
    """Invoice numbers sorted by sort (number, customer, amount or issued_on), ties by number,
    optionally only those with this status. ValueError for any other sort."""
    ...
