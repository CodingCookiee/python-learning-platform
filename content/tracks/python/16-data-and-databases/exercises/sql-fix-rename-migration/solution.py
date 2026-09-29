def upgrade(conn):
    """Migration 0005: rename company to employer, add a required source column."""
    with conn:
        conn.execute("ALTER TABLE applications RENAME COLUMN company TO employer")
        conn.execute("ALTER TABLE applications ADD COLUMN source TEXT NOT NULL DEFAULT 'job board'")
        conn.execute("UPDATE applications SET source = 'referral' WHERE notes LIKE '%referral%'")
