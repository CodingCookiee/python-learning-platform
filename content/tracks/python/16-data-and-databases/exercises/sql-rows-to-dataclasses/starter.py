from dataclasses import dataclass


@dataclass
class Application:
    id: int
    company: str
    role: str
    status: str
    applied_on: str


def find_applications(conn, status):
    """Every Application with this status, newest first, ties broken by id."""
    ...


def get_application(conn, application_id):
    """The Application with this id, or None."""
    ...
