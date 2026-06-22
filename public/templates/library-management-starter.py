# Library Management System - Starter Template

"""Starter scaffold for the Module 4 Library Management System project."""


class Book:
    """Represents a book in the library."""

    def __init__(self, title, author, isbn):
        # TODO: Initialize title, author, isbn attributes
        # TODO: Track available copies
        pass

    def __str__(self):
        # TODO: Return a readable string representation
        pass

    def __repr__(self):
        # TODO: Return a developer-friendly representation
        pass


class User:
    """Represents a library user."""

    def __init__(self, name, user_id):
        # TODO: Initialize name and user_id
        # TODO: Track borrowed books
        # TODO: Track borrowing history
        pass


class Library:
    """Manages books and users."""

    def __init__(self):
        # TODO: Initialize books and users storage
        pass

    def add_book(self, book):
        # TODO: Add a book to the library
        pass

    def remove_book(self, isbn):
        # TODO: Remove a book by ISBN
        pass

    def search_book(self, query):
        # TODO: Search by title, author, or ISBN
        pass

    def register_user(self, user):
        # TODO: Register a new user
        pass

    def borrow_book(self, user_id, isbn):
        # TODO: Allow user to borrow a book
        # TODO: Track due dates
        pass

    def return_book(self, user_id, isbn):
        # TODO: Process book return
        # TODO: Calculate late fees if applicable
        pass

    def get_available_books(self):
        # TODO: Return list of available books
        pass


class LibraryCLI:
    """Command-line interface for the library."""

    def __init__(self):
        # TODO: Initialize the library
        pass

    def display_menu(self):
        """Display the main menu."""
        print("\n=== Library Management System ===")
        print("1. Add a book")
        print("2. Remove a book")
        print("3. Search for a book")
        print("4. Register a user")
        print("5. Borrow a book")
        print("6. Return a book")
        print("7. View available books")
        print("8. Exit")

    def run(self):
        """Run the CLI application."""
        print("Welcome to the Library Management System!")

        while True:
            self.display_menu()
            # TODO: Handle user input
            # TODO: Route to appropriate function
            pass


if __name__ == "__main__":
    cli = LibraryCLI()
    cli.run()
