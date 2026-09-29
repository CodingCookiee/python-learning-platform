def scope_tools(tools: list[dict], registry: dict, allow: set[str]) -> tuple[list[dict], dict]:
    """The tool definitions and registry, cut down to the allowed names."""
    names = {tool["name"] for tool in tools}
    unknown = sorted(set(allow) - names)
    if unknown:
        raise ValueError(f"Can't allow tools that don't exist: {', '.join(unknown)}")
    definitions = [tool for tool in tools if tool["name"] in allow]
    scoped = {name: fn for name, fn in registry.items() if name in allow}
    return definitions, scoped
