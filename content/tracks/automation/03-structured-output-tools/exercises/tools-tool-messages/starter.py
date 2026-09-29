import json


def assistant_message(response):
    """The neutral assistant message for a response, including its tool calls."""
    return {"role": "assistant", "content": response.text, "tool_calls": response.tool_calls}


def tool_result(call, output):
    """The neutral tool message answering one tool call."""
    return {"role": "tool", "tool_call_id": call.id, "content": output}
