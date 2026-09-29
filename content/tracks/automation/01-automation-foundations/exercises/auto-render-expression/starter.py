import re


def render(template, item):
    """Fill {{ $json.path }} expressions from item["json"]; a lone expression keeps its value's type."""
    ...
