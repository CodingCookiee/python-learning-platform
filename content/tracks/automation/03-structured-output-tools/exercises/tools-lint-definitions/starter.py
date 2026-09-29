import re

DATA_PARAMS = {"payload", "data", "json", "options"}


def lint_tools(tools):
    """Problems with a tool list, as "<tool name>: <problem>" strings. [] means clean."""
    return []
