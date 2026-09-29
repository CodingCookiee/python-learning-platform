def open_applications(conn):
    """(company, role) for every application with status 'applied' or 'interview',
    oldest first, ties broken by company."""
    return conn.execute(
        """
        SELECT company, role
        FROM applications
        WHERE status IN ('applied', 'interview')
        ORDER BY applied_on, company
        """
    ).fetchall()
