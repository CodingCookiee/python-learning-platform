import json


def text_result(value, *, is_error=False) -> dict:
    """A tools/call result with one text block: strings as they are, anything else as JSON."""
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    return {"content": [{"type": "text", "text": text}], "isError": is_error}
