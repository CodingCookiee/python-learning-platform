def index_by_email(users):
    """Return {normalised email: user_id} for a {user_id: email} dict."""
    return {email.strip().lower(): user_id for user_id, email in users.items()}
