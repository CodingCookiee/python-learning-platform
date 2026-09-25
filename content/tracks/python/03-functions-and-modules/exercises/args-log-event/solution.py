def log_line(level, message, /, **fields):
    """Return "LEVEL message key=value ...", quoting values that contain a space."""
    parts = [level.upper(), message]
    for key, value in fields.items():
        text = str(value)
        if " " in text:
            text = f'"{text}"'
        parts.append(f"{key}={text}")
    return " ".join(parts)
