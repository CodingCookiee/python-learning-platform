def find_user(conn, email):
    """The (id, name) of the user with this email, or None."""
    return conn.execute(f"SELECT id, name FROM users WHERE email = '{email}'").fetchone()
