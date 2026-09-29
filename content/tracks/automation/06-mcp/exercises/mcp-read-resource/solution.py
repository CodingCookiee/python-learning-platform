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
    return {"resources": [
        {"uri": uri, "name": doc.name, "title": doc.title, "mimeType": doc.mime_type, "size": size_of(doc.content)}
        for uri, doc in DOCS.items()
    ]}


def size_of(content: str | bytes) -> int:
    return len(content.encode() if isinstance(content, str) else content)


def list_templates() -> dict:
    return {"resourceTemplates": [PERSON_TEMPLATE]}


def item(uri: str, mime_type: str, content: str | bytes) -> dict:
    if isinstance(content, bytes):
        return {"uri": uri, "mimeType": mime_type, "blob": base64.b64encode(content).decode("ascii")}
    return {"uri": uri, "mimeType": mime_type, "text": content}


def read_resource(params: dict) -> dict:
    uri = params.get("uri")
    if not isinstance(uri, str):
        raise InvalidParams("uri is required")
    doc = DOCS.get(uri)
    if doc is not None:
        return {"contents": [item(uri, doc.mime_type, doc.content)]}
    variables = match_template(PERSON_TEMPLATE["uriTemplate"], uri)
    if variables and variables["handle"] in PEOPLE:
        page = person_page(PEOPLE[variables["handle"]])
        return {"contents": [item(uri, PERSON_TEMPLATE["mimeType"], page)]}
    raise ResourceNotFound(uri)


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    try:
        if method == "initialize":
            reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"resources": {}},
                               "serverInfo": {"name": "kiln-wiki", "version": "0.4.0"}}
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
    return reply
