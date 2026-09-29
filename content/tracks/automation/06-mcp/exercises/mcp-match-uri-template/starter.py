import re


def match_template(template: str, uri: str) -> dict[str, str] | None:
    """The {name} variables of template matched in uri, or None if it doesn't fit."""
    ...
