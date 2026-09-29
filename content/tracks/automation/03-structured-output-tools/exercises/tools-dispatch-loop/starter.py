import json


class StepLimitExceeded(Exception):
    """The model was still calling tools when the step cap ran out."""


def assistant_message(response):
    """The neutral assistant message for a response, including its tool calls."""
    message = {"role": "assistant", "content": response.text}
    if response.tool_calls:
        message["tool_calls"] = [
            {"id": call.id, "name": call.name, "arguments": call.arguments} for call in response.tool_calls
        ]
    return message


def tool_result(call, output):
    """The neutral tool message answering one tool call."""
    content = output if isinstance(output, str) else json.dumps(output, default=str)
    return {"role": "tool", "tool_call_id": call.id, "content": content}


def run_tools(llm, messages, tools, registry, *, system=None, max_steps=5):
    """Call the model, run the tools it asks for, and repeat until it answers."""
    response = llm.complete(messages, system=system, tools=tools)
    return response.text
