import json


async def app(scope, receive, send):
    """A raw ASGI app: GET /health answers {"status": "ok"}."""
    headers = [(b"content-type", b"application/json")]
    if scope["path"] != "/health":
        status, data = 404, {"detail": "Not Found"}
    elif scope["method"] != "GET":
        status, data = 405, {"detail": "Method Not Allowed"}
        headers.append((b"allow", b"GET"))
    else:
        status, data = 200, {"status": "ok"}

    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": json.dumps(data).encode()})
