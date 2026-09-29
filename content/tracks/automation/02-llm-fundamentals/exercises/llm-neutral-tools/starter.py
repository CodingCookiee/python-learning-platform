def to_anthropic_tool(tool):
    """A neutral tool as Anthropic expects it: the schema under input_schema."""
    ...


def to_openai_tool(tool):
    """A neutral tool as OpenAI expects it: wrapped in {"type": "function", "function": ...}."""
    ...
