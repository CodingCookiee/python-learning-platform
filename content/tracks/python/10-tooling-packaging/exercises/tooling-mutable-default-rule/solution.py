import ast
import re

MESSAGE = "B006 Do not use mutable data structures for argument defaults"
MUTABLE_NODES = (ast.List, ast.Dict, ast.Set, ast.ListComp, ast.DictComp, ast.SetComp)
MUTABLE_CALLS = {"list", "dict", "set", "defaultdict", "deque", "Counter", "OrderedDict"}
NOQA = re.compile(r"#\s*noqa(?P<codes>:\s*[A-Z]+[0-9]+(?:[\s,]+[A-Z]+[0-9]+)*)?", re.IGNORECASE)


def is_mutable(node):
    if isinstance(node, MUTABLE_NODES):
        return True
    if isinstance(node, ast.Call):
        func = node.func
        name = func.id if isinstance(func, ast.Name) else func.attr if isinstance(func, ast.Attribute) else None
        return name in MUTABLE_CALLS
    return False


def silenced(line):
    match = NOQA.search(line)
    if match is None:
        return False
    return match["codes"] is None or "B006" in re.findall(r"[A-Z]+[0-9]+", match["codes"].upper())


def find_mutable_defaults(source):
    """One "line:col: B006 ..." message per mutable default argument, sorted by position."""
    lines = source.splitlines()
    positions = []
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            continue
        defaults = [*node.args.defaults, *(d for d in node.args.kw_defaults if d is not None)]
        for default in defaults:
            if is_mutable(default) and not silenced(lines[default.lineno - 1]):
                positions.append((default.lineno, default.col_offset + 1))
    return [f"{line}:{column}: {MESSAGE}" for line, column in sorted(positions)]
