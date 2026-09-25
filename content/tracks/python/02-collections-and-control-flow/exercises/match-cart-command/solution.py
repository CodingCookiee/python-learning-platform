def cart_action(command):
    """Describe what a typed cart command will do."""
    match command.split():
        case ["add", item]:
            return f"Add 1 x {item}"
        case ["add", item, quantity] if quantity.isdigit():
            return f"Add {quantity} x {item}"
        case ["remove", *items] if items:
            return "Remove " + ", ".join(items)
        case ["clear"]:
            return "Empty the cart"
        case ["checkout"]:
            return "Go to checkout"
        case _:
            return f'Unknown command: "{command}"'
