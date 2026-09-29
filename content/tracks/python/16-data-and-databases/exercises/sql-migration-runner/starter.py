def migrate(conn, migrations):
    """Run every migration the database hasn't had, each in its own transaction with the
    user_version update, and return how many ran."""
    ...
