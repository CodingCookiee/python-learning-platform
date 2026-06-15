# CLI Calculator Starter Template

"""Starter scaffold for the Module 1 calculator project."""


def display_menu():
    """Display the calculator menu."""
    print("\n=== Python Calculator ===")
    print("1. Addition (+)")
    print("2. Subtraction (-)")
    print("3. Multiplication (*)")
    print("4. Division (/)")
    print("5. Exit")
    print("=" * 25)


def get_numbers():
    """Get two numbers from the user."""
    # TODO: Prompt for the first and second numbers
    # TODO: Convert input to float
    # TODO: Handle invalid input with a friendly message
    pass


def add(a, b):
    """Add two numbers."""
    # TODO: Return the sum
    pass


def subtract(a, b):
    """Subtract two numbers."""
    # TODO: Return the difference
    pass


def multiply(a, b):
    """Multiply two numbers."""
    # TODO: Return the product
    pass


def divide(a, b):
    """Divide two numbers."""
    # TODO: Guard against division by zero
    # TODO: Return the quotient
    pass


def main():
    """Run the calculator app."""
    print("Welcome to Python Calculator!")

    while True:
        display_menu()
        # TODO: Read the user's choice
        # TODO: Route to the correct operation
        # TODO: Show the result
        # TODO: Allow the user to exit cleanly
        pass


if __name__ == "__main__":
    main()
