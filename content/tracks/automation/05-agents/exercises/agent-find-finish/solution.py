def finish_arguments(response) -> dict | None:
    """The arguments of the response's first finish call, or None."""
    return next((call.arguments for call in response.tool_calls if call.name == "finish"), None)
