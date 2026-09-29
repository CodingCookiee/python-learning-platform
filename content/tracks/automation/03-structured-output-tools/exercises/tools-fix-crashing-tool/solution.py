import json
import logging

logger = logging.getLogger("order_assistant")


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


def tool_message(call, content):
    return {"role": "tool", "tool_call_id": call.id, "content": content}


def run_one(call, registry) -> str:
    """Run one tool call. Failures become an error result instead of an exception."""
    if call.name not in registry:
        logger.warning("Model asked for unknown tool %s", call.name)
        return json.dumps({"error": f"Unknown tool: {call.name}"})
    try:
        output = registry[call.name](**call.arguments)
    except Exception as error:
        logger.warning("Tool %s failed: %s", call.name, error)
        return json.dumps({"error": str(error)})
    return json.dumps(output, default=str)


def run_tools(llm, messages, tools, registry, *, max_steps=5):
    """Call the model, run the tools it asks for, and repeat until it answers."""
    messages = list(messages)
    for _step in range(max_steps):
        response = llm.complete(messages, tools=tools)
        if not response.tool_calls:
            return response.text
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            messages.append(tool_message(call, run_one(call, registry)))
    raise StepLimitExceeded(f"Still calling tools after {max_steps} steps")
