import json


def text_result(value, *, is_error=False) -> dict:
    """A tools/call result with one text block: strings as they are, anything else as JSON."""
    ...
