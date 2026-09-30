import base64
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Doc:
    name: str
    title: str
    mime_type: str
    content: str | bytes


DOCS = {
    "policy://returns": Doc("returns", "Returns policy", "text/markdown",
                            "# Returns\n\nUnused items can be returned within 30 days of delivery."),
    "policy://shipping": Doc("shipping", "Shipping policy", "text/markdown",
                             "# Shipping\n\nOrders ship within two working days. Café orders ship on Mondays."),
    "wiki://brand/logo": Doc("logo", "Kiln & Co logo", "image/png", b"\x89PNG\r\n\x1a\n-kiln-logo-"),
}

PEOPLE = {
    "ada": {"name": "Ada Obi", "role": "Support lead", "topics": "refunds, damaged items"},
    "tom": {"name": "Tom Reid", "role": "Warehouse", "topics": "shipping, stock"},
}

PERSON_TEMPLATE = {"uriTemplate": "wiki://people/{handle}", "name": "person",
                   "title": "Staff profile", "mimeType": "text/markdown"}


def person_page(person: dict) -> str:
    return f"# {person['name']}\n\n{person['role']}. Ask about: {person['topics']}."


def match_template(template: str, uri: str) -> dict | None:
    pattern = re.sub(r"\\\{(\w+)\\\}", r"(?P<\1>[^/]+)", re.escape(template))
    match = re.fullmatch(pattern, uri)
    return match.groupdict() if match else None


class InvalidParams(Exception):
    pass


class ResourceNotFound(Exception):
    pass


def list_resources() -> dict:
    ...


def list_templates() -> dict:
    ...


def read_resource(params: dict) -> dict:
    ...


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    try:
        if method == "server/discover":
            reply["result"] = {"supportedVersions": ["2026-07-28"], "capabilities": {"resources": {}},
                               "_meta": {"io.modelcontextprotocol/serverInfo": {"name": "kiln-wiki", "version": "0.4.0"}}}
        elif method == "resources/list":
            reply["result"] = list_resources()
        elif method == "resources/templates/list":
            reply["result"] = list_templates()
        elif method == "resources/read":
            reply["result"] = read_resource(params)
        else:
            reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    except InvalidParams as problem:
        reply["error"] = {"code": -32602, "message": f"Invalid params: {problem}"}
    except ResourceNotFound as missing:
        uri = str(missing)
        reply["error"] = {"code": -32602, "message": f"Resource not found: {uri}", "data": {"uri": uri}}
    if "result" in reply:
        reply["result"] = {"resultType": "complete", **reply["result"]}
    return reply
