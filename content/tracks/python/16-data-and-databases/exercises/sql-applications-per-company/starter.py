def applications_per_company(conn, min_applications=0):
    """[(company name, applications), ...] for companies with at least min_applications,
    most first, ties by name. Companies with no applications count as 0."""
    ...
