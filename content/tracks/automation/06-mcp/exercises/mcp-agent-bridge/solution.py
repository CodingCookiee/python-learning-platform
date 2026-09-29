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
        self.prefix = prefix
        self.client = client

    def definitions(self) -> list[dict]:
        return [
            {
                "name": f"{self.prefix}__{tool['name']}",
                "description": tool.get("description", ""),
                "parameters": tool["inputSchema"],
            }
            for tool in self.client.list_tools()
        ]

    def owns(self, name: str) -> bool:
        return name.startswith(f"{self.prefix}__")

    def call(self, name: str, arguments: dict) -> str:
        tool = name.removeprefix(f"{self.prefix}__")
        reply = self.client.request("tools/call", {"name": tool, "arguments": arguments})
        if "error" in reply:
            return json.dumps({"error": reply["error"]["message"]})
        return result_to_text(reply["result"])


def run_agent(llm, question: str, toolboxes: list[McpToolbox], *, max_steps: int = 6) -> str:
    """Answer question with the tools of every toolbox."""
    tools = [definition for box in toolboxes for definition in box.definitions()]
    messages: list[dict] = [{"role": "user", "content": question}]
    for _step in range(max_steps):
        response = llm.complete(messages, tools=tools)
        if not response.tool_calls:
            return response.text
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            box = next((box for box in toolboxes if box.owns(call.name)), None)
            if box is None:
                content = json.dumps({"error": f"Unknown tool: {call.name}"})
            else:
                content = box.call(call.name, call.arguments)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
    raise StepLimitExceeded(f"Still calling tools after {max_steps} steps")
