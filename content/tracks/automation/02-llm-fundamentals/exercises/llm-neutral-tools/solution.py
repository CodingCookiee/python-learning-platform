def to_anthropic_tool(tool):
    """A neutral tool as Anthropic expects it: the schema under input_schema."""
    return {
        "name": tool["name"],
        "description": tool.get("description", ""),
        "input_schema": tool["parameters"],
    }


def to_openai_tool(tool):
    """A neutral tool as OpenAI expects it: wrapped in {"type": "function", "function": ...}."""
    return {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "parameters": tool["parameters"],
        },
    }
