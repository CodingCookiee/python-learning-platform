import json


def assistant_message(response) -> dict:
    """The neutral assistant message for a response, including its tool calls."""
    message = {"role": "assistant", "content": response.text}
    if response.tool_calls:
        message["tool_calls"] = [
            {"id": call.id, "name": call.name, "arguments": call.arguments} for call in response.tool_calls
        ]
    return message


def tool_result(call, output) -> dict:
    """The neutral tool message answering one tool call."""
    content = output if isinstance(output, str) else json.dumps(output, default=str)
    return {"role": "tool", "tool_call_id": call.id, "content": content}
