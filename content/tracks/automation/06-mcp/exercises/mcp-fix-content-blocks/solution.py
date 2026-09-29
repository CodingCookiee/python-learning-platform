import json


def block_text(block: dict) -> str:
    kind = block.get("type")
    if kind == "text":
        return block.get("text", "")
    if kind in ("image", "audio"):
        return f"[{kind}: {block.get('mimeType')}]"
    if kind == "resource_link":
        return f"[resource: {block.get('uri')}]"
    if kind == "resource":
        resource = block.get("resource", {})
        return resource.get("text") or f"[resource: {resource.get('uri')}]"
    return f"[{kind} content]"


def result_to_text(result: dict) -> str:
    """The text of the neutral tool message for an MCP tools/call result."""
    blocks = result.get("content") or []
    if blocks:
        text = "\n".join(block_text(block) for block in blocks)
    elif "structuredContent" in result:
        text = json.dumps(result["structuredContent"])
    else:
        text = ""
    return json.dumps({"error": text}) if result.get("isError") else text
