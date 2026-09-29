import json

HANDLERS = {
    "ping": lambda params: {},
    "tools/list": lambda params: {"tools": [{"name": "get_order"}]},
}


def handle(message):
    if "id" not in message:
        return None
    method = HANDLERS.get(message["method"])
    if method is None:
        error = {"code": -32601, "message": f"Method not found: {message['method']}"}
        return {"jsonrpc": "2.0", "id": message["id"], "error": error}
    return {"jsonrpc": "2.0", "id": message["id"], "result": method(message.get("params", {}))}


inbox = [
    '{"jsonrpc": "2.0", "id": 0, "method": "ping"}',
    '{"jsonrpc": "2.0", "method": "notifications/initialized"}',
    '{"jsonrpc": "2.0", "id": "a1", "method": "tools/list"}',
    '{"jsonrpc": "2.0", "id": 2, "method": "prompts/list"}',
    '{"jsonrpc": "2.0", "method": "prompts/list"}',
]

for line in inbox:
    reply = handle(json.loads(line))
    if reply is None:
        print("(no reply)")
    elif "error" in reply:
        print(reply["id"], reply["error"]["code"])
    else:
        print(reply["id"], json.dumps(reply["result"]))
