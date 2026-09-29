def upgrade(conn):
    """Migration 0005: rename company to employer, add a required source column."""
    conn.execute("ALTER TABLE applications ADD COLUMN employer TEXT NOT NULL")
    conn.execute("ALTER TABLE applications DROP COLUMN company")
    conn.execute("ALTER TABLE applications ADD COLUMN source TEXT NOT NULL")
