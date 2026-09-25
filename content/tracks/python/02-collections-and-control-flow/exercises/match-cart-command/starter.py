def cart_action(command):
    """Describe what a typed cart command will do."""
    match command.split():
        case _:
            return f'Unknown command: "{command}"'
