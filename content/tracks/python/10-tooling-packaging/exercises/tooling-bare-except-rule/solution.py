import ast


def find_bare_excepts(source):
    """One "line:col: E722 ..." message per bare except: clause, in source order."""
    positions = sorted(
        (node.lineno, node.col_offset + 1)
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.ExceptHandler) and node.type is None
    )
    return [f"{line}:{column}: E722 Do not use bare `except`" for line, column in positions]
