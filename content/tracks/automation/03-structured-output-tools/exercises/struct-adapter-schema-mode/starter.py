class Refused(Exception):
    """The model declined to produce the structured output."""


def schema_options(provider, schema):
    """The request-body fields that ask this provider for output matching schema."""
    return {"schema": schema}


def structured_text(provider, body):
    """The JSON text in a structured-output response from this provider."""
    ...
