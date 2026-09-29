def neutral_tools(mcp_tools: list[dict], prefix: str | None = None) -> list[dict]:
    """Translate an MCP tools/list into neutral {"name", "description", "parameters"} tools."""
    return [
        {
            "name": f"{prefix}__{tool['name']}" if prefix else tool["name"],
            "description": tool.get("description", ""),
            "parameters": dict(tool["inputSchema"]),
        }
        for tool in mcp_tools
    ]
