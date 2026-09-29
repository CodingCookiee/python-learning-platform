from typing import Any


def strict_schema(schema: dict) -> dict:
    """A copy of schema where every object forbids extra properties and requires all of its properties."""
    return _strict(schema)


def _strict(node: Any) -> Any:
    if isinstance(node, list):
        return [_strict(item) for item in node]
    if not isinstance(node, dict):
        return node
    result = {key: _strict(value) for key, value in node.items()}
    if result.get("type") == "object":
        properties = result.get("properties")
        if not properties:
            raise ValueError(f"Strict mode can't express a free-form object: {node.get('title', node)}")
        result["additionalProperties"] = False
        result["required"] = list(properties)
    return result
