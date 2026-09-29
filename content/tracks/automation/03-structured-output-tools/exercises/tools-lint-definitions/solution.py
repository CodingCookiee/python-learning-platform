import re

DATA_PARAMS = {"payload", "data", "json", "options"}
NAME = re.compile(r"[a-z][a-z0-9]*(_[a-z0-9]+)+")


def lint_tools(tools: list[dict]) -> list[str]:
    """Problems with a tool list, as "<tool name>: <problem>" strings. [] means clean."""
    problems: list[str] = []
    seen: set[str] = set()
    for tool in tools:
        name = tool.get("name", "")
        found = []
        if not NAME.fullmatch(name):
            found.append("name should be verb_noun snake_case")
        if len(tool.get("description") or "") < 40:
            found.append("description is too short to tell the model when to use it")
        properties = tool.get("parameters", {}).get("properties", {})
        for param, schema in properties.items():
            if not schema.get("description"):
                found.append(f"parameter {param} has no description")
        for param, schema in properties.items():
            if param in DATA_PARAMS and schema.get("type") == "string":
                found.append(f"parameter {param} looks like JSON in a string; use typed parameters")
        if name in seen:
            found.append("duplicate tool name")
        seen.add(name)
        problems.extend(f"{name}: {problem}" for problem in found)
    return problems
