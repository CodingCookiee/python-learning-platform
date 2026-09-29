import re

EXPRESSION = re.compile(r"\{\{\s*(.*?)\s*\}\}")
STEP = re.compile(r"\.(\w+)|\[(\d+)\]")


def resolve(path, item):
    """The value at a $json path like $json.lines[0].sku, or None if any step is missing."""
    if not path.startswith("$json"):
        return None
    value = item["json"]
    for key, index in STEP.findall(path[len("$json"):]):
        if key and isinstance(value, dict) and key in value:
            value = value[key]
        elif index and isinstance(value, list) and int(index) < len(value):
            value = value[int(index)]
        else:
            return None
    return value


def render(template, item):
    """Fill {{ $json.path }} expressions from item["json"]; a lone expression keeps its value's type."""
    whole = EXPRESSION.fullmatch(template)
    if whole:
        return resolve(whole.group(1), item)

    def replace(match):
        value = resolve(match.group(1), item)
        return "" if value is None else str(value)

    return EXPRESSION.sub(replace, template)
