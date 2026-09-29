import re

NOQA = re.compile(r"#\s*noqa(?P<codes>:\s*[A-Z]+[0-9]+(?:[\s,]+[A-Z]+[0-9]+)*)?", re.IGNORECASE)


def suppressed(line, code):
    """True if a # noqa comment on this line silences the rule `code`."""
    match = NOQA.search(line)
    if match is None:
        return False
    if match["codes"] is None:
        return True  # a bare noqa silences everything
    return code in re.findall(r"[A-Z]+[0-9]+", match["codes"].upper())
