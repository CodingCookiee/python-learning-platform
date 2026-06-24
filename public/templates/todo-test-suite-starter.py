# Test Suite for Todo App - Starter Template

"""Starter scaffold for the Module 6 test suite project."""

from __future__ import annotations

import pytest


class Todo:
    """Simple todo item used by the test suite."""

    def __init__(self, title: str, completed: bool = False):
        self.title = title
        self.completed = completed

    def mark_complete(self) -> None:
        self.completed = True

    def __repr__(self) -> str:
        return f"Todo(title={self.title!r}, completed={self.completed!r})"


class TodoList:
    """Tiny sample app to exercise in tests."""

    def __init__(self):
        self._items: list[Todo] = []

    def add(self, title: str) -> Todo:
        todo = Todo(title)
        self._items.append(todo)
        return todo

    def complete(self, title: str) -> None:
        for todo in self._items:
            if todo.title == title:
                todo.mark_complete()
                return
        raise ValueError(f"Todo not found: {title}")

    def delete(self, title: str) -> None:
        before = len(self._items)
        self._items = [todo for todo in self._items if todo.title != title]
        if len(self._items) == before:
            raise ValueError(f"Todo not found: {title}")

    def filter(self, completed: bool) -> list[Todo]:
        return [todo for todo in self._items if todo.completed is completed]

    def __len__(self) -> int:
        return len(self._items)


@pytest.fixture
def todo_list() -> TodoList:
    """Provide a fresh todo list for each test."""
    todos = TodoList()
    todos.add("Write tests")
    todos.add("Review fixtures")
    return todos


def test_add_todo(todo_list: TodoList) -> None:
    todo = todo_list.add("Ship feature")
    assert todo.title == "Ship feature"
    assert len(todo_list) == 3


def test_complete_todo(todo_list: TodoList) -> None:
    todo_list.complete("Write tests")
    assert todo_list.filter(completed=True)[0].title == "Write tests"


def test_delete_todo(todo_list: TodoList) -> None:
    todo_list.delete("Review fixtures")
    assert len(todo_list) == 1


def test_filter_completed(todo_list: TodoList) -> None:
    todo_list.complete("Write tests")
    completed = todo_list.filter(completed=True)
    pending = todo_list.filter(completed=False)
    assert len(completed) == 1
    assert len(pending) == 1


def test_delete_missing_todo_raises(todo_list: TodoList) -> None:
    with pytest.raises(ValueError):
        todo_list.delete("Missing item")


def test_complete_missing_todo_raises(todo_list: TodoList) -> None:
    with pytest.raises(ValueError):
        todo_list.complete("Missing item")


if __name__ == "__main__":
    print("Run this template with pytest.")
