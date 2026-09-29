def current_version(conn):
    return conn.execute("PRAGMA user_version").fetchone()[0]


def migrate(conn, migrations):
    """Run every migration the database hasn't had, each in its own transaction with the
    user_version update, and return how many ran."""
    version = current_version(conn)
    if version > len(migrations):
        raise RuntimeError(f"The database is at version {version}, but only {len(migrations)} migrations are known")
    applied = 0
    for number, statements in enumerate(migrations, start=1):
        if number <= version:
            continue
        conn.execute("BEGIN")
        try:
            for statement in statements:
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {number}")
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        applied += 1
    return applied
