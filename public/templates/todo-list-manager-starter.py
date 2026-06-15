# Todo List Manager Starter Template

"""Starter scaffold for the Module 2 todo application."""

import json
import os
from datetime import datetime

TODOS_FILE = "todos.json"


def load_todos():
    """Load todos from disk."""
    # TODO: Return a list of todos, or an empty list if the file is missing
    pass


def save_todos(todos):
    """Save todos to disk."""
    # TODO: Serialize todos to JSON
    pass


def generate_id(todos):
    """Generate a new todo ID."""
    # TODO: Return a unique integer ID
    pass


def add_todo(todos):
    """Add a todo item."""
    # TODO: Ask for title and description
    # TODO: Append a todo dictionary to the list
    pass


def list_todos(todos, filter_status="all"):
    """List todos with optional filtering."""
    # TODO: Filter by pending/completed/all and print the results
    pass


def complete_todo(todos):
    """Mark a todo as complete."""
    # TODO: Find the matching todo and mark it complete
    pass


def delete_todo(todos):
    """Delete a todo."""
    # TODO: Remove a todo by ID
    pass


def main():
    """Run the todo app."""
    todos = load_todos()

    while True:
        print("\n=== Todo List Manager ===")
        print("1. Add todo")
        print("2. List all todos")
        print("3. List pending todos")
        print("4. List completed todos")
        print("5. Complete todo")
        print("6. Delete todo")
        print("7. Exit")

        # TODO: Add the menu flow
        # TODO: Save before exit
        pass


if __name__ == "__main__":
    main()
