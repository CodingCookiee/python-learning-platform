import json

from pydantic import BaseModel


class ExtractionFailed(Exception):
    """The model couldn't produce a usable reply."""


def strict_schema(schema):
    """A copy of schema where every object forbids extra properties and requires all of its properties."""
    if isinstance(schema, list):
        return [strict_schema(item) for item in schema]
    if not isinstance(schema, dict):
        return schema
    result = {key: strict_schema(value) for key, value in schema.items()}
    if result.get("type") == "object" and result.get("properties"):
        result["additionalProperties"] = False
        result["required"] = list(result["properties"])
    return result


_decoder = json.JSONDecoder()


def extract_json(text):
    """Return the first JSON object (a dict) in text. ValueError if there isn't one."""
    start = text.find("{")
    while start != -1:
        try:
            value, _end = _decoder.raw_decode(text, start)
        except json.JSONDecodeError:
            pass
        else:
            if isinstance(value, dict):
                return value
        start = text.find("{", start + 1)
    raise ValueError("No JSON object found in the reply")


def extract_native[M: BaseModel](llm, document: str, model_cls: type[M], *, system: str) -> M:
    """Extract model_cls from document with schema=, falling back to prompt-only JSON."""
    messages = [{"role": "user", "content": f"<document>\n{document}\n</document>"}]
    schema = strict_schema(model_cls.model_json_schema())
    try:
        response = llm.complete(messages, system=system, schema=schema, temperature=0)
    except NotImplementedError:
        fallback_system = (
            system + "\n\nReply with only a JSON object that matches this JSON schema:\n" + json.dumps(schema)
        )
        response = llm.complete(messages, system=fallback_system, temperature=0)
    if response.stop_reason == "max_tokens":
        raise ExtractionFailed("The reply was cut off at max_tokens")
    if response.stop_reason == "refusal":
        raise ExtractionFailed(f"The model refused: {response.text}")
    return model_cls.model_validate(extract_json(response.text))
