import json


class StepLimitExceeded(Exception):
    """The model was still calling tools when the step cap ran out."""


def block_text(block: dict) -> str:
    kind = block.get("type")
    if kind == "text":
        return block.get("text", "")
    if kind == "resource_link":
        return f"[resource: {block.get('uri')}]"
    return f"[{kind} content]"


def result_to_text(result: dict) -> str:
    """The text of the neutral tool message for an MCP tools/call result."""
    text = "\n".join(block_text(block) for block in result.get("content") or [])
    return json.dumps({"error": text}) if result.get("isError") else text


def assistant_message(response) -> dict:
    """The neutral assistant message for a response, including its tool calls."""
    message = {"role": "assistant", "content": response.text}
    if response.tool_calls:
        message["tool_calls"] = [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]
    return message


class McpToolbox:
    """One MCP server's tools, as neutral tools with a name prefix."""

    def __init__(self, prefix: str, client):
        ...

    def definitions(self) -> list[dict]:
        ...

    def owns(self, name: str) -> bool:
        ...

    def call(self, name: str, arguments: dict) -> str:
        ...


def run_agent(llm, question: str, toolboxes: list[McpToolbox], *, max_steps: int = 6) -> str:
    """Answer question with the tools of every toolbox."""
    ...
