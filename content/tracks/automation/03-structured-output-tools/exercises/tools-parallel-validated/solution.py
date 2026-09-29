import json
from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import BaseModel, ValidationError


@dataclass
class Tool:
    name: str
    description: str
    args: type[BaseModel]            # validates the arguments
    fn: Callable[[Any], Any]         # called with a validated instance of args

    def definition(self):
        parameters = self.args.model_json_schema()
        parameters.pop("title", None)
        parameters.pop("description", None)
        return {"name": self.name, "description": self.description, "parameters": parameters}


@dataclass
class Run:
    answer: str
    steps: int                                            # model calls made
    executed: list[str] = field(default_factory=list)     # tools that actually ran, in order


class StepLimitExceeded(Exception):
    """The model was still calling tools when the step cap ran out."""


def validation_feedback(error):
    """One "location: message" line per problem in a ValidationError."""
    return "\n".join(
        f"{'.'.join(str(part) for part in item['loc']) or '(root)'}: {item['msg']}" for item in error.errors()
    )


def assistant_message(response):
    """The neutral assistant message for a response, including its tool calls."""
    message = {"role": "assistant", "content": response.text}
    if response.tool_calls:
        message["tool_calls"] = [
            {"id": call.id, "name": call.name, "arguments": call.arguments} for call in response.tool_calls
        ]
    return message


def run_agent(llm, question: str, tools: list[Tool], *, system: str, max_steps: int = 6) -> Run:
    """Answer question, running the validated tools the model asks for."""
    by_name = {tool.name: tool for tool in tools}
    definitions = [tool.definition() for tool in tools]
    messages: list[dict] = [{"role": "user", "content": question}]
    executed: list[str] = []
    for step in range(1, max_steps + 1):
        response = llm.complete(messages, system=system, tools=definitions)
        if not response.tool_calls:
            return Run(answer=response.text, steps=step, executed=executed)
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            output = execute(call, by_name, executed)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(output, default=str)})
    raise StepLimitExceeded(f"Still calling tools after {max_steps} steps")


def execute(call, by_name: dict[str, Tool], executed: list[str]) -> Any:
    """Validate and run one tool call. Every failure becomes an {"error": ...} result."""
    tool = by_name.get(call.name)
    if tool is None:
        return {"error": f"Unknown tool: {call.name}"}
    try:
        arguments = tool.args.model_validate(call.arguments)
    except ValidationError as error:
        return {"error": f"Invalid arguments for {call.name}: {validation_feedback(error)}"}
    try:
        output = tool.fn(arguments)
    except Exception as error:
        return {"error": str(error)}
    executed.append(call.name)
    return output
