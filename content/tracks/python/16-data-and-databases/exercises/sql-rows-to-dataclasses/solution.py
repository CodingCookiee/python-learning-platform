from dataclasses import dataclass


@dataclass
class Application:
    id: int
    company: str
    role: str
    status: str
    applied_on: str


def _cursor(conn):
    """A cursor whose rows come back as Application objects."""
    cursor = conn.cursor()
    cursor.row_factory = lambda cur, row: Application(*row)
    return cursor


def find_applications(conn, status):
    """Every Application with this status, newest first, ties broken by id."""
    return _cursor(conn).execute(
        """
        SELECT id, company, role, status, applied_on
        FROM applications
        WHERE status = ?
        ORDER BY applied_on DESC, id
        """,
        (status,),
    ).fetchall()


def get_application(conn, application_id):
    """The Application with this id, or None."""
    return _cursor(conn).execute(
        "SELECT id, company, role, status, applied_on FROM applications WHERE id = ?",
        (application_id,),
    ).fetchone()
