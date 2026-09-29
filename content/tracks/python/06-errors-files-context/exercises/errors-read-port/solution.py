def read_port(settings):
    """The port setting as an int, or ValueError saying what's wrong with it."""
    try:
        text = settings["port"]
    except KeyError as error:
        raise ValueError("missing setting: port") from error
    try:
        port = int(text)
    except ValueError as error:
        raise ValueError(f"port must be a whole number, got {text!r}") from error
    if not 1 <= port <= 65535:
        raise ValueError(f"port {port} is out of range 1-65535")
    return port
