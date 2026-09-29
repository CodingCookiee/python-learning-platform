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


def schema_of(model: type[BaseModel]) -> dict:
    schema = model.model_json_schema()
    schema.pop("title", None)
    schema.pop("description", None)
    return schema


def problems(error: ValidationError) -> str:
    return "; ".join(f"{'.'.join(str(part) for part in e['loc'])}: {e['msg']}" for e in error.errors())


def failure(text: str) -> dict:
    return {"content": [{"type": "text", "text": text}], "isError": True}


class UnknownTool(Exception):
    pass


class ToolServer:
    """An MCP tool server whose tools return structured content."""

    def __init__(self, name: str, version: str, tools: list[Tool]):
        self.info = {"name": name, "version": version}
        self.tools = {tool.name: tool for tool in tools}

    def handle(self, message: dict) -> dict | None:
        if "id" not in message:
            return None
        reply = {"jsonrpc": "2.0", "id": message["id"]}
        method, params = message.get("method"), message.get("params") or {}
        if method == "initialize":
            reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}}, "serverInfo": self.info}
        elif method == "tools/list":
            reply["result"] = {"tools": [self.definition(tool) for tool in self.tools.values()]}
        elif method == "tools/call":
            try:
                reply["result"] = self.call(params)
            except UnknownTool as unknown:
                reply["error"] = {"code": -32602, "message": f"Unknown tool: {unknown}"}
        else:
            reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
        return reply

    def definition(self, tool: Tool) -> dict:
        return {
            "name": tool.name,
            "title": tool.title,
            "description": inspect.getdoc(tool.args),
            "inputSchema": schema_of(tool.args),
            "outputSchema": schema_of(tool.output),
        }

    def call(self, params: dict) -> dict:
        tool = self.tools.get(params.get("name"))
        if tool is None:
            raise UnknownTool(params.get("name"))
        try:
            arguments = tool.args.model_validate(params.get("arguments") or {})
        except ValidationError as error:
            return failure(f"Invalid arguments: {problems(error)}")
        try:
            value = tool.fn(arguments)
        except ToolError as error:
            return failure(str(error))
        try:
            checked = tool.output.model_validate(value)
        except ValidationError as error:
            logger.error("Tool %s returned invalid output: %s", tool.name, problems(error))
            return failure(f"{tool.name} returned invalid output")
        data = checked.model_dump(mode="json")
        return {"content": [{"type": "text", "text": json.dumps(data)}], "structuredContent": data, "isError": False}
