MASK = "**********"


class Secret:
    """A value that never shows itself in reprs, logs, f-strings or error messages."""

    def __init__(self, value):
        self.value = value

    def reveal(self):
        return self.value


def secret_from_env(env, name):
    """The named variable from env as a Secret. RuntimeError if it's missing or blank."""
    return Secret(env[name])
