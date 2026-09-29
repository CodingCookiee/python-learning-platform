def create_invoices_table(conn):
    """Create the invoices table, with constraints that refuse bad rows."""
    conn.execute(
        """
        CREATE TABLE invoices (
            id           INTEGER PRIMARY KEY,
            number       TEXT    NOT NULL UNIQUE,
            customer     TEXT    NOT NULL,
            amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
            status       TEXT    NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'sent', 'paid')),
            issued_on    TEXT
        )
        """
    )
