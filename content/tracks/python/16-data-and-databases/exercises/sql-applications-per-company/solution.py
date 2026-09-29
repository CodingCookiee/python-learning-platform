def applications_per_company(conn, min_applications=0):
    """[(company name, applications), ...] for companies with at least min_applications,
    most first, ties by name. Companies with no applications count as 0."""
    return conn.execute(
        """
        SELECT c.name, count(a.id) AS applications
        FROM companies AS c
        LEFT JOIN applications AS a ON a.company_id = c.id
        GROUP BY c.id
        HAVING count(a.id) >= ?
        ORDER BY applications DESC, c.name
        """,
        (min_applications,),
    ).fetchall()
