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
import re
from typing import Any, Callable, Iterable

__all__ = [
    "test",
    "hidden",
    "raises",
    "run_program",
    "ProgramResult",
    "load_module",
    "call_main",
    "CliResult",
    "captured_logs",
    "fresh_logging",
    "solution_source",
    "source_uses",
    "source_avoids",
    "defined_names",
    "TestTimeout",
]


class TestTimeout(Exception):
    """Raised inside the learner's code when a test runs past its time limit."""


_UNSET: Any = object()

# Tests registered by the current tests.py, in definition order
_REGISTRY: list[dict] = []

# The learner's code, set by the runner before tests.py is imported
_SOLUTION: dict = {"source": "", "filename": "solution.py"}


def _register(name: str | None, *, hidden: bool, timeout: Any) -> Callable:
    def decorator(fn: Callable) -> Callable:
        label = name or fn.__name__.strip("_").replace("_", " ") or f"Test {len(_REGISTRY) + 1}"
        entry = {"name": label, "fn": fn, "hidden": hidden}
        if timeout is not _UNSET:
            entry["timeout"] = timeout
        _REGISTRY.append(entry)
        return fn

    return decorator


def test(name: str | Callable | None = None, *, timeout: float | None = _UNSET) -> Callable:
    """Register a visible test. Use as @test("What it checks") or bare @test.

    Each test's time in the learner's code is limited (2 s by default). Pass
    timeout=10 for a slower check, or timeout=None to switch the limit off (for
    timing measurements, where the tracer's overhead would skew results).
    """
    if callable(name):
        return _register(None, hidden=False, timeout=timeout)(name)
    return _register(name, hidden=False, timeout=timeout)


def hidden(name: str | Callable | None = None, *, timeout: float | None = _UNSET) -> Callable:
    """Register a hidden test: it runs and reports pass or fail, but its body isn't shown."""
    if callable(name):
        return _register(None, hidden=True, timeout=timeout)(name)
    return _register(name, hidden=True, timeout=timeout)


def _call_text(fn: Callable, args: tuple, kwargs: dict) -> str:
    parts = [repr(a) for a in args] + [f"{k}={v!r}" for k, v in kwargs.items()]
    text = f"{getattr(fn, '__name__', 'the call')}({', '.join(parts)})"
    return text if len(text) <= 120 else text[:119] + "…"


class raises:
    """Check that code raises an exception, optionally with a matching message.

        raises(ValueError, split_bill, 10, 0)               # call form
        with raises(ValueError, match="at least one"):       # block form
            split_bill(10, 0)

    `match` is a regular expression searched in str(exception). The caught
    exception is available as .value. An exception of a different type is
    reported as an error in the learner's code, which is what it is.
    """

    def __init__(
        self,
        expected: type[BaseException] | tuple,
        fn: Callable | None = None,
        *args,
        match: str | None = None,
        what: str | None = None,
        **kwargs,
    ):
        """`what` names the code in failure messages for the block form, e.g.
        with raises(ValueError, what="split_bill(10, 0)"): ..."""
        self.expected = expected
        self.match = match
        self.value: BaseException | None = None
        self._what = what or "the code"
        if fn is not None:
            self._what = _call_text(fn, args, kwargs)
            try:
                fn(*args, **kwargs)
            except self.expected as exc:  # type: ignore[misc]
                self._check(exc)
                return
            raise AssertionError(f"{self._what} should raise {self._name()}, but it didn't")

    def _name(self) -> str:
        if isinstance(self.expected, tuple):
            return " or ".join(e.__name__ for e in self.expected)
        return self.expected.__name__

    def _check(self, exc: BaseException) -> None:
        if self.match is not None and not re.search(self.match, str(exc)):
            raise AssertionError(
                f"{self._what} raised {type(exc).__name__} as expected, but its message {str(exc)!r} "
                f"doesn't match {self.match!r}"
            )
        self.value = exc

    def __enter__(self) -> "raises":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        if exc_type is None:
            if self._what != "the code":
                raise AssertionError(f"{self._what} should raise {self._name()}, but it didn't")
            raise AssertionError(f"Expected {self._name()} to be raised, but nothing was raised")
        if not issubclass(exc_type, self.expected):
            return False  # a different error: let it surface as the learner's error
        self._check(exc)
        return True


class ProgramResult(str):
    """What a program printed. Behaves like a str, with a few helpers:
    .lines, .prompts (text passed to input()), .stderr, and .exit_code
    (0 when it ran to the end, or the code it passed to sys.exit / SystemExit)."""

    prompts: str = ""
    stderr: str = ""
    exit_code: int | None = 0

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


def _exit_code(exc: SystemExit) -> int:
    code = exc.code
    if code is None:
        return 0
    if isinstance(code, int):
        return code
    return 1  # sys.exit("message") prints the message and exits with 1


def run_program(
    stdin: Iterable[str] = (),
    *,
    argv: Iterable[str] | None = None,
    include_prompts: bool = False,
    source: str | None = None,
) -> ProgramResult:
    """Run the learner's file as a script, feeding it `stdin` lines, and return what it printed.

    - `argv`: command-line arguments (sys.argv[1:]), for CLI scripts.
    - SystemExit is caught: the output is kept and the code is in .exit_code,
      so a test can check both what `raise SystemExit(main())` printed and its status.
    - stderr is captured separately into .stderr.
    - Input prompts are left out unless include_prompts=True.
    - `source` runs a modified copy, e.g.
      run_program(source=solution_source().replace("total = 150", "total = 50")).
    """
    import sys

    source = _SOLUTION["source"] if source is None else source
    filename = _SOLUTION["filename"]
    feed = _InputFeed(stdin)
    out, err = io.StringIO(), io.StringIO()
    namespace = {"__name__": "__main__", "__file__": filename, "__builtins__": builtins}
    original_input, original_argv = builtins.input, sys.argv
    builtins.input = feed
    sys.argv = [filename, *(str(a) for a in (argv or ()))]
    exit_code: int | None = 0
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            try:
                exec(compile(source, filename, "exec"), namespace)
            except SystemExit as exc:
                exit_code = _exit_code(exc)
                if isinstance(exc.code, str):
                    err.write(exc.code + "\n")
    finally:
        builtins.input, sys.argv = original_input, original_argv
    text = out.getvalue()
    if include_prompts:
        # Interleaving isn't recoverable after the fact; prompts come first
        text = feed.prompts.getvalue() + text
    result = ProgramResult(text)
    result.prompts = feed.prompts.getvalue()
    result.stderr = err.getvalue()
    result.exit_code = exit_code
    return result


class CliResult:
    """The outcome of calling a CLI entry point: .code, .out, .err (and .lines of out)."""

    def __init__(self, code: int, out: str, err: str, returned: object = None):
        self.code = code
        self.out = ProgramResult(out)
        self.err = err
        self.returned = returned

    @property
    def lines(self) -> list[str]:
        return self.out.lines

    def __repr__(self) -> str:
        return f"<exit {self.code}, out={str(self.out)[:60]!r}, err={self.err[:60]!r}>"


def call_main(main: Callable, argv: Iterable[str] = ()) -> CliResult:
    """Call a CLI's main(argv) the way a shell would, and capture what happened:

        r = call_main(main, ["report", "--format", "csv"])
        assert r.code == 0 and r.lines[0] == "date,hours"
        assert call_main(main, ["--bogus"]).code == 2     # argparse usage error

    The exit code is main's return value (None → 0), or the code of a SystemExit
    it raised (argparse errors exit with 2 and write usage to stderr).
    """
    out, err = io.StringIO(), io.StringIO()
    returned: object = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            returned = main([str(a) for a in argv])
            code = 0 if returned is None else int(returned) if isinstance(returned, (int, bool)) else 1
        except SystemExit as exc:
            code = _exit_code(exc)
            if isinstance(exc.code, str):
                err.write(exc.code + "\n")
    return CliResult(code, out.getvalue(), err.getvalue(), returned)


# Logging: capture records, and start each test from a clean configuration


class _Records(list):
    """Captured log records, with helpers: .messages, .levels, .text"""

    @property
    def messages(self) -> list[str]:
        return [r.getMessage() for r in self]

    @property
    def levels(self) -> list[str]:
        return [r.levelname for r in self]

    @property
    def text(self) -> str:
        return "\n".join(f"{r.levelname} {r.name}: {r.getMessage()}" for r in self)


@contextlib.contextmanager
def captured_logs(logger: str | None = None, level: int | str = "DEBUG"):
    """Capture log records sent to a logger (the root by default, so everything):

        with captured_logs("solution") as logs:
            apply_discount(order, "SPRING")
        assert logs.messages == ["Applied SPRING to order 1042"]
        assert logs.levels == ["INFO"]
    """
    import logging

    records = _Records()

    class _Handler(logging.Handler):
        def emit(self, record):
            records.append(record)

    target = logging.getLogger(logger)
    handler = _Handler(level=logging.DEBUG)
    old_level, old_disabled = target.level, logging.root.manager.disable
    target.addHandler(handler)
    target.setLevel(level)
    logging.disable(logging.NOTSET)
    try:
        yield records
    finally:
        target.removeHandler(handler)
        target.setLevel(old_level)
        logging.disable(old_disabled)


def fresh_logging() -> None:
    """Reset logging to Python's start-up state: no handlers, root at WARNING, every
    other logger back to NOTSET and propagating. The runner calls this before each
    test, so logging configured by one test (or run) never leaks into the next."""
    import logging

    logging.disable(logging.NOTSET)
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    for f in list(root.filters):
        root.removeFilter(f)
    root.setLevel(logging.WARNING)
    for name, obj in list(logging.root.manager.loggerDict.items()):
        if isinstance(obj, logging.Logger):
            for h in list(obj.handlers):
                obj.removeHandler(h)
            for f in list(obj.filters):
                obj.removeFilter(f)
            obj.setLevel(logging.NOTSET)
            obj.propagate = True
            obj.disabled = False


class LoadedModule:
    """The learner's file loaded as an ordinary module: attributes are its globals,
    and .printed is everything it printed while loading."""

    def __init__(self, namespace: dict, printed: str):
        self.__dict__.update(namespace)
        self.printed = ProgramResult(printed)
        self.printed.prompts = ""


def load_module(name: str = "learner_module", *, source: str | None = None) -> LoadedModule:
    """Import a fresh copy of the learner's file under `name` (so __name__ != "__main__")
    and capture what it prints while loading. Use it to check that a file has no
    side effects on import:

        assert load_module("converter").printed == ""
    """
    code = _SOLUTION["source"] if source is None else source
    namespace = {"__name__": name, "__file__": _SOLUTION["filename"], "__builtins__": builtins}
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        exec(compile(code, _SOLUTION["filename"], "exec"), namespace)
    return LoadedModule(namespace, out.getvalue())


def solution_source() -> str:
    """The learner's source code, as written."""
    return _SOLUTION["source"]


def defined_names(kind: str = "any") -> list[str]:
    """Top-level names the learner's code defines: kind is "function", "class" or "any".
    Methods count too for "function" (as "Class.method")."""
    names: list[str] = []
    for item in ast.parse(_SOLUTION["source"]).body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and kind in ("function", "any"):
            names.append(item.name)
        elif isinstance(item, ast.ClassDef):
            if kind in ("class", "any"):
                names.append(item.name)
            if kind == "function":
                names += [
                    f"{item.name}.{m.name}"
                    for m in item.body
                    if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))
                ]
        elif isinstance(item, ast.Assign) and kind == "any":
            names += [t.id for t in item.targets if isinstance(t, ast.Name)]
    return names


def _dotted(node: ast.AST) -> str | None:
    """"itertools.pairwise" for an Attribute chain, "pairwise" for a Name."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        base = _dotted(node.value)
        return f"{base}.{node.attr}" if base else node.attr
    return None


def _names_match(node: ast.AST, wanted: str) -> bool:
    """A Name or Attribute matches "pairwise" as pairwise or itertools.pairwise,
    and matches "itertools.pairwise" only when written that way or imported from it."""
    full = _dotted(node)
    if full is None:
        return False
    return full == wanted or full.rsplit(".", 1)[-1] == wanted


def _matches(tree: ast.AST, *, node: str | None, call: str | None, name: str | None) -> bool:
    imported_from: dict[str, str] = {}  # local name -> "module.name", for "from x import y"
    for item in ast.walk(tree):
        if isinstance(item, ast.ImportFrom) and item.module:
            for alias in item.names:
                imported_from[alias.asname or alias.name] = f"{item.module}.{alias.name}"
    for item in ast.walk(tree):
        if node is not None and type(item).__name__ == node:
            return True
        if call is not None and isinstance(item, ast.Call):
            if _names_match(item.func, call):
                return True
            if isinstance(item.func, ast.Name) and imported_from.get(item.func.id) == call:
                return True
        if name is not None and isinstance(item, (ast.Name, ast.Attribute)):
            # Only the outermost part of an attribute chain, so "os.path" isn't also "os"
            if _names_match(item, name):
                return True
            if isinstance(item, ast.Name) and imported_from.get(item.id) == name:
                return True
        if name is not None and isinstance(item, ast.alias) and (item.asname or item.name) == name:
            return True
    return False


def source_uses(*, node: str | None = None, call: str | None = None, name: str | None = None) -> bool:
    """True if the learner's code contains an AST node type (e.g. "ListComp"),
    a call to a function or method (e.g. "enumerate"), or a name (e.g. "Counter")."""
    return _matches(ast.parse(_SOLUTION["source"]), node=node, call=call, name=name)


def source_avoids(*, node: str | None = None, call: str | None = None, name: str | None = None) -> bool:
    """The opposite of source_uses."""
    return not source_uses(node=node, call=call, name=name)


# pytest: grading drills where the learner writes the tests (needs packages: [pytest])


class PytestResult:
    def __init__(self, passed: list[str], failed: list[str], errors: list[str], output: str):
        self.passed = passed
        self.failed = failed
        self.errors = errors
        self.output = output

    @property
    def total(self) -> int:
        return len(self.passed) + len(self.failed) + len(self.errors)

    def __repr__(self) -> str:
        return f"<{len(self.passed)} passed, {len(self.failed)} failed, {len(self.errors)} errors>"


_pytest_runs = 0


def pytest_run(files: dict[str, str]) -> PytestResult:
    """Write `files` ({"pricing.py": ..., "test_pricing.py": ...}) to a fresh folder and run
    pytest on it. Returns which tests passed and failed.

    Typical use: run the learner's tests (solution_source()) against a correct
    implementation (they should all pass) and against planted bugs (some should fail).
    """
    global _pytest_runs
    import os
    import sys
    import tempfile

    import pytest

    _pytest_runs += 1
    folder = tempfile.mkdtemp(prefix=f"plp_pytest_{_pytest_runs}_")
    for name, source in files.items():
        with open(os.path.join(folder, name), "w", encoding="utf8") as fh:
            fh.write(source)

    # The files' modules must be imported fresh every run (a planted bug replaces the real one)
    stems = {os.path.splitext(name)[0] for name in files if name.endswith(".py")}
    for stem in stems:
        sys.modules.pop(stem, None)

    outcome: dict[str, list[str]] = {"passed": [], "failed": [], "errors": []}

    class _Collector:
        def pytest_runtest_logreport(self, report):
            if report.when == "call":
                bucket = "passed" if report.passed else "failed" if report.failed else None
                if bucket:
                    outcome[bucket].append(report.nodeid.split("::", 1)[-1])
            elif report.failed:  # setup or teardown blew up (e.g. a broken fixture)
                outcome["errors"].append(report.nodeid.split("::", 1)[-1])

        def pytest_collectreport(self, report):
            if report.failed:
                outcome["errors"].append(f"collecting {report.nodeid or 'tests'}")

    out = io.StringIO()
    cwd = os.getcwd()
    sys.path.insert(0, folder)
    try:
        os.chdir(folder)
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            pytest.main(
                # fd-level capture and faulthandler need real OS file descriptors, which Pyodide lacks
                [folder, "-q", "--no-header", "--capture=sys", "-p", "no:cacheprovider", "-p", "no:faulthandler"],
                plugins=[_Collector()],
            )
    finally:
        os.chdir(cwd)
        sys.path.remove(folder)
        for stem in stems:
            sys.modules.pop(stem, None)
    return PytestResult(outcome["passed"], outcome["failed"], outcome["errors"], out.getvalue())


# mypy: grading type-hint drills (needs packages: [mypy])


class TypecheckResult:
    def __init__(self, errors: list[str], output: str):
        self.errors = errors
        self.output = output

    @property
    def ok(self) -> bool:
        return not self.errors

    def __repr__(self) -> str:
        return f"<{len(self.errors)} type error(s)>"


def typecheck(source: str | None = None, *, strict: bool = False, extra_files: dict[str, str] | None = None) -> TypecheckResult:
    """Run mypy on the learner's code (or `source`). Returns the error lines, e.g.
    'solution.py:4: error: Argument 1 to "total" has incompatible type "str"; expected "int"'."""
    import os
    import tempfile

    from mypy import api

    folder = tempfile.mkdtemp(prefix="plp_mypy_")
    target = os.path.join(folder, "solution.py")
    with open(target, "w", encoding="utf8") as fh:
        fh.write(_SOLUTION["source"] if source is None else source)
    for name, text in (extra_files or {}).items():
        with open(os.path.join(folder, name), "w", encoding="utf8") as fh:
            fh.write(text)
    args = [target, "--no-incremental", "--no-error-summary", "--hide-error-context", "--show-error-codes"]
    if strict:
        args.append("--strict")
    cwd = os.getcwd()
    try:
        os.chdir(folder)
        stdout, stderr, _status = api.run(args)
    finally:
        os.chdir(cwd)
    lines = [
        line.replace(target, "solution.py").replace(folder + os.sep, "")
        for line in stdout.splitlines()
        if ": error:" in line
    ]
    return TypecheckResult(lines, stdout + stderr)
