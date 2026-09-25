import re

FIELD = re.compile(r'(\w+)=(?:"([^"]*)"|(\S*))')


def parse_fields(line):
    """The key=value pairs in a log line, as a dict of strings, in order."""
    fields = {}
    for m in FIELD.finditer(line):
        key, quoted, bare = m.groups()
        fields[key] = quoted if quoted is not None else bare
    return fields
