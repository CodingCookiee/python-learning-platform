def is_id(value) -> bool:
    """A JSON-RPC id: a string or an integer (bool is an int subclass, so rule it out)."""
    return isinstance(value, (str, int)) and not isinstance(value, bool)


def check_message(message) -> list[str]:
    """The problems with a JSON-RPC 2.0 message's shape, or [] if it's valid."""
    if not isinstance(message, dict):
        return ["message must be a JSON object"]
    problems = []
    if message.get("jsonrpc") != "2.0":
        problems.append('jsonrpc must be "2.0"')

    if "method" in message:
        method = message["method"]
        if not isinstance(method, str) or not method:
            problems.append("method must be a non-empty string")
        if "id" in message and not is_id(message["id"]):
            problems.append("id must be a string or an integer")
        if "params" in message and not isinstance(message["params"], dict):
            problems.append("params must be an object")
        if "result" in message or "error" in message:
            problems.append("a request can't have result or error")
        return problems

    has_result, has_error = "result" in message, "error" in message
    if "id" not in message:
        problems.append("a response needs an id")
    elif not (is_id(message["id"]) or (message["id"] is None and has_error)):
        problems.append("id must be a string or an integer")
    if not has_result and not has_error:
        problems.append("a response needs result or error")
    elif has_result and has_error:
        problems.append("a response can't have both result and error")
    if has_error:
        error = message["error"]
        code = error.get("code") if isinstance(error, dict) else None
        good_code = isinstance(code, int) and not isinstance(code, bool)
        if not (good_code and isinstance(error.get("message"), str)):
            problems.append("error needs an integer code and a string message")
    return problems
