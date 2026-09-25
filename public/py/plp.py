"""pylearn test helpers.

Drill test files import from here:

    from plp import test, hidden, run_program, source_uses
    from solution import add

    @test("Adds two numbers")
    def _():
        assert add(2, 3) == 5

The runner (plp_runner.py) resets this module's state before every run.
"""

from __future__ import annotations

import ast
import builtins
import contextlib
import io
from typing import Callable, Iterable

__all__ = [
    "test",
    "hidden",
    "run_program",
    "ProgramResult",
    "solution_source",
    "source_uses",
    "source_avoids",
]

# Tests registered by the current tests.py, in definition order
_REGISTRY: list[dict] = []

# The learner's code, set by the runner before tests.py is imported
_SOLUTION: dict = {"source": "", "filename": "solution.py"}


def _register(name: str | None, *, hidden: bool) -> Callable:
    def decorator(fn: Callable) -> Callable:
        label = name or fn.__name__.strip("_").replace("_", " ") or f"Test {len(_REGISTRY) + 1}"
        _REGISTRY.append({"name": label, "fn": fn, "hidden": hidden})
        return fn

    return decorator


def test(name: str | Callable | None = None) -> Callable:
    """Register a visible test. Use as @test("What it checks") or bare @test."""
    if callable(name):
        return _register(None, hidden=False)(name)
    return _register(name, hidden=False)


def hidden(name: str | Callable | None = None) -> Callable:
    """Register a hidden test: it runs and reports pass or fail, but its body isn't shown."""
    if callable(name):
        return _register(None, hidden=True)(name)
    return _register(name, hidden=True)


class ProgramResult(str):
    """What a program printed. Behaves like a str, with a few helpers."""

    prompts: str

    @property
    def lines(self) -> list[str]:
        """Printed lines with trailing whitespace removed and blank lines dropped."""
        return [line.rstrip() for line in self.splitlines() if line.strip()]


class _InputFeed:
    def __init__(self, lines: Iterable[str]):
        self._lines = [str(line) for line in lines]
        self._index = 0
        self.prompts = io.StringIO()

    def __call__(self, prompt: object = "") -> str:
        self.prompts.write(str(prompt))
        if self._index >= len(self._lines):
            raise EOFError(
                f"The program asked for input a {self._index + 1}{_ordinal_suffix(self._index + 1)} "
                f"time, but this test only provides {len(self._lines)} line"
                f"{'' if len(self._lines) == 1 else 's'}"
            )
        line = self._lines[self._index]
        self._index += 1
        return line


def _ordinal_suffix(n: int) -> str:
    if 10 <= n % 100 <= 20:
        return "th"
    return {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


def run_program(stdin: Iterable[str] = (), *, include_prompts: bool = False) -> ProgramResult:
    """Run the learner's file as a script, feeding it `stdin` lines, and return what it printed.

    Input prompts (the text passed to input()) are left out of the result unless
    include_prompts=True, so tests can compare just the program's own output.
    """
    source = _SOLUTION["source"]
    filename = _SOLUTION["filename"]
    feed = _InputFeed(stdin)
    out = io.StringIO()
    namespace = {"__name__": "__main__", "__file__": filename, "__builtins__": builtins}
    original_input = builtins.input
    builtins.input = feed
    try:
        with contextlib.redirect_stdout(out):
            exec(compile(source, filename, "exec"), namespace)
    finally:
        builtins.input = original_input
    text = out.getvalue()
    if include_prompts:
        # Interleaving isn't recoverable after the fact; prompts come first
        text = feed.prompts.getvalue() + text
    result = ProgramResult(text)
    result.prompts = feed.prompts.getvalue()
    return result


def solution_source() -> str:
    """The learner's source code, as written."""
    return _SOLUTION["source"]


def _matches(tree: ast.AST, *, node: str | None, call: str | None, name: str | None) -> bool:
    for item in ast.walk(tree):
        if node is not None and type(item).__name__ == node:
            return True
        if call is not None and isinstance(item, ast.Call):
            target = item.func
            called = (
                target.id
                if isinstance(target, ast.Name)
                else target.attr
                if isinstance(target, ast.Attribute)
                else None
            )
            if called == call:
                return True
        if name is not None and isinstance(item, ast.Name) and item.id == name:
            return True
    return False


def source_uses(*, node: str | None = None, call: str | None = None, name: str | None = None) -> bool:
    """True if the learner's code contains an AST node type (e.g. "ListComp"),
    a call to a function or method (e.g. "enumerate"), or a name (e.g. "Counter")."""
    return _matches(ast.parse(_SOLUTION["source"]), node=node, call=call, name=name)


def source_avoids(*, node: str | None = None, call: str | None = None, name: str | None = None) -> bool:
    """The opposite of source_uses."""
    return not source_uses(node=node, call=call, name=name)
