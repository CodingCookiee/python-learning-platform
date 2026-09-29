import re


def match_template(template: str, uri: str) -> dict[str, str] | None:
    """The {name} variables of template matched in uri, or None if it doesn't fit."""
    pattern = re.sub(r"\\\{(\w+)\\\}", r"(?P<\1>[^/]+)", re.escape(template))
    match = re.fullmatch(pattern, uri)
    return match.groupdict() if match else None
