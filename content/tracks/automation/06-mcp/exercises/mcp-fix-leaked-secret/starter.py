import json
import os


def redact(text, secrets):
    for secret in sorted((s for s in secrets if s), key=len, reverse=True):
        text = text.replace(secret, "[redacted]")
    return text


def settings():
    return {
        "shop": "kiln-and-co",
        "api_url": "https://kiln-and-co.shop.example/admin/api",
        "token": os.environ["KILN_SHOP_TOKEN"],
        "currency": "GBP",
    }


def fetch(url, headers=None):
    """GET url and return the JSON body. In production this is httpx.get(url, headers=headers, timeout=10)."""
    raise ConnectionError(f"Timed out after 10s fetching {url}")


def shop_info(arguments):
    """The shop's name, API address and currency."""
    return settings()


def sync_status(arguments):
    """When the product catalogue last synced, and whether it succeeded."""
    config = settings()
    return fetch(f"{config['api_url']}/sync?access_token={config['token']}")


TOOLS = {"shop_info": shop_info, "sync_status": sync_status}


def text_result(text, is_error=False):
    return {"content": [{"type": "text", "text": text}], "isError": is_error}


def call_tool(params):
    tool = TOOLS[params["name"]]
    try:
        value = tool(params.get("arguments") or {})
    except Exception as error:
        return text_result(str(error), is_error=True)
    return text_result(json.dumps(value))


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "initialize":
        reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                           "serverInfo": {"name": "kiln-shop", "version": "0.9.0"}}
    elif method == "tools/call" and params.get("name") in TOOLS:
        reply["result"] = call_tool(params)
    elif method == "tools/call":
        reply["error"] = {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    return reply
