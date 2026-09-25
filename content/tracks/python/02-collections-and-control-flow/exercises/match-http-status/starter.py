def status_label(code):
    """Return the dashboard label for an HTTP status code."""
    match code:
        case 200:
            return "OK"
