APPLICATIONS_FOR_COMPANY = "SELECT id, role FROM applications WHERE company_id = ?"
INTERVIEWS_FOR_APPLICATION = "SELECT id, scheduled_at FROM interviews WHERE application_id = ? ORDER BY scheduled_at"
RECENT_BY_STATUS = "SELECT id FROM applications WHERE status = ? AND applied_on >= ?"


def query_plan(conn, sql, params=()):
    """The detail text of each EXPLAIN QUERY PLAN row for this query."""
    ...


def add_indexes(conn):
    """Create the indexes the three queries above need. Safe to run twice."""
    ...
