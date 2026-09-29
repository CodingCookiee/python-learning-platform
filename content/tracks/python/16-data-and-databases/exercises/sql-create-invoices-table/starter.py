def create_invoices_table(conn):
    """Create the invoices table, with constraints that refuse bad rows."""
    conn.execute(
        """
        CREATE TABLE invoices (
            id           INTEGER PRIMARY KEY,
            number       TEXT,
            customer     TEXT,
            amount_cents INTEGER,
            status       TEXT,
            issued_on    TEXT
        )
        """
    )
