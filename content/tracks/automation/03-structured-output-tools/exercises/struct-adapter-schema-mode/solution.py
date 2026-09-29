class Refused(Exception):
    """The model declined to produce the structured output."""


def schema_options(provider: str, schema: dict) -> dict:
    """The request-body fields that ask this provider for output matching schema."""
    if provider == "anthropic":
        return {"output_config": {"format": {"type": "json_schema", "schema": schema}}}
    if provider == "openai":
        return {
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema.get("title", "output"), "strict": True, "schema": schema},
            }
        }
    raise ValueError(f"Unknown provider: {provider!r}")


def structured_text(provider: str, body: dict) -> str:
    """The JSON text in a structured-output response from this provider."""
    if provider == "anthropic":
        if body.get("stop_reason") == "refusal":
            raise Refused("The model declined to answer")
        return "".join(block["text"] for block in body["content"] if block["type"] == "text")
    if provider == "openai":
        message = body["choices"][0]["message"]
        if message.get("refusal"):
            raise Refused(message["refusal"])
        return message["content"]
    raise ValueError(f"Unknown provider: {provider!r}")
