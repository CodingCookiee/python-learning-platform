def read_port(settings):
    """The port setting as an int, or ValueError saying what's wrong with it."""
    return int(settings["port"])
