def to_anthropic(tool: dict) -> dict:
    """A neutral tool in Anthropic's Messages API format."""
    return {"name": tool["name"], "description": tool["description"], "input_schema": tool["parameters"]}


def to_openai(tool: dict) -> dict:
    """A neutral tool in OpenAI's Chat Completions format."""
    return {
        "type": "function",
        "function": {"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]},
    }
