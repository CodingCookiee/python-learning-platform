import inspect
import json
import logging
from dataclasses import dataclass
from typing import Any, Callable

from pydantic import BaseModel, ValidationError

logger = logging.getLogger("leith_physio")


class ToolError(Exception):
    """A failure the model should hear about, in words it can act on."""


@dataclass
class Tool:
    name: str
    title: str                                 # for people: shown in the host's UI
    args: type[BaseModel]                      # validates the arguments; its docstring is the description
    output: type[BaseModel]                    # what fn returns
    fn: Callable[[Any], Any]


class ToolServer:
    """An MCP tool server whose tools return structured content."""

    def __init__(self, name: str, version: str, tools: list[Tool]):
        ...

    def handle(self, message: dict) -> dict | None:
        ...
