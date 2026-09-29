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


def run_agent(llm, question, tools, *, system, max_steps=6):
    """Answer question, running the validated tools the model asks for."""
    ...
