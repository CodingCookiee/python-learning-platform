def trim_history(messages: list[dict], *, keep_last: int = 6) -> list[dict]:
    """The first message (the task) and the most recent keep_last messages,
    never starting on a tool result whose call was cut."""
    if len(messages) <= keep_last + 1:
        return list(messages)
    start = len(messages) - keep_last
    while start < len(messages) and messages[start]["role"] == "tool":
        start += 1
    return [messages[0]] + messages[start:]
