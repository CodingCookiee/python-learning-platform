import hmac

MASK = "**********"


class Secret:
    """A value that never shows itself in reprs, logs, f-strings or error messages."""

    def __init__(self, value: str):
        self._value = value

    def reveal(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return f"Secret('{MASK}')"

    def __str__(self) -> str:
        return MASK

    def __eq__(self, other):
        if not isinstance(other, Secret):
            return NotImplemented
        return hmac.compare_digest(self._value.encode(), other._value.encode())

    __hash__ = None


def secret_from_env(env, name: str) -> Secret:
    """The named variable from env as a Secret. RuntimeError if it's missing or blank."""
    value = env.get(name, "")
    if not value.strip():
        raise RuntimeError(f"{name} is not set")
    return Secret(value)
