def status_label(code):
    """Return the dashboard label for an HTTP status code."""
    match code:
        case 200:
            return "OK"
        case 201:
            return "Created"
        case 404:
            return "Not found"
        case 500 | 502 | 503:
            return "Server error"
        case _:
            return "Unknown"
