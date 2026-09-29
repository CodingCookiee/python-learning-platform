import json


def result_to_text(result: dict) -> str:
    """The text of the neutral tool message for an MCP tools/call result."""
    return result["content"][0]["text"]
