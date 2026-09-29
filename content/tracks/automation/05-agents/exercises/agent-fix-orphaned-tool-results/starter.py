def trim_history(messages, *, keep_last=6):
    """The first message (the task) and the most recent keep_last messages."""
    if len(messages) <= keep_last + 1:
        return list(messages)
    return [messages[0]] + messages[-keep_last:]
