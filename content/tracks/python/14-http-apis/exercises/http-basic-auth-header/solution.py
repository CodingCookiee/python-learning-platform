import base64


def basic_auth_header(username, password):
    """The Authorization header value for HTTP basic auth."""
    if ":" in username:
        raise ValueError("a basic auth username can't contain ':'")
    credentials = f"{username}:{password}".encode("utf-8")
    return "Basic " + base64.b64encode(credentials).decode("ascii")
