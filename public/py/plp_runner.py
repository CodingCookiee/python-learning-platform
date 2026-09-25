"""pylearn runner: executes learner code and drill tests, returns JSON-ready results.

Shared by the browser worker (public/workers/python-worker.js) and the content
validator (scripts/content), so a drill behaves identically in both.

    await run_code(code, stdin=None)            -> run mode: output of the program
    await run_tests(solution, tests)            -> grade mode: one result per test
"""

from __future__ import annotations

import ast
import asyncio
import builtins
import contextlib
import inspect
import io
import linecache
import sys
import time
import traceback
import types

import plp

MAX_OUTPUT = 20_000
MAX_REPR = 300
USER_FILES = ("main.py", "solution.py")


# Helpers


def _register_source(filename: str, source: str) -> None:
    """Make tracebacks show source lines for code that never touched the disk."""
    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)


def _clip(text: str, limit: int = MAX_OUTPUT) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n… output truncated ({len(text) - limit:,} more characters)"


def _short_repr(value: object) -> str:
    try:
        text = repr(value)
    except Exception as exc:  # a learner's __repr__ can raise
        text = f"<unrepresentable {type(value).__name__}: {exc}>"
    return text if len(text) <= MAX_REPR else text[: MAX_REPR - 1] + "…"


class _NoInput:
    """input() when a run has no stdin: explain instead of hanging."""

    def __call__(self, prompt: object = "") -> str:
        sys.stdout.write(str(prompt))
        raise EOFError("This program reads input, but no input lines were provided")


class _Feed:
    def __init__(self, lines: list[str]):
        self._lines = list(lines)

    def __call__(self, prompt: object = "") -> str:
        sys.stdout.write(str(prompt))
        if not self._lines:
            raise EOFError("The program asked for more input than was provided")
        line = self._lines.pop(0)
        sys.stdout.write(line + "\n")  # echo, like a terminal
        return line


@contextlib.contextmanager
def _patched_input(fn):
    original = builtins.input
    builtins.input = fn
    try:
        yield
    finally:
        builtins.input = original


def _describe_exception(exc: BaseException, *, files: tuple[str, ...] = USER_FILES) -> dict:
    """A traceback trimmed to the learner's own frames."""
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in files]
    line = None
    if isinstance(exc, SyntaxError) and exc.filename in files:
        line = exc.lineno
    elif frames:
        line = frames[-1].lineno
    text = "".join(traceback.format_list(frames))
    if text:
        text = "Traceback (most recent call last):\n" + text
    text += "".join(traceback.format_exception_only(type(exc), exc))
    return {
        "type": type(exc).__name__,
        "message": str(exc),
        "line": line,
        "traceback": _clip(text.rstrip(), 6_000),
    }


async def _execute(code_obj, namespace: dict) -> None:
    result = eval(code_obj, namespace)
    if inspect.iscoroutine(result):  # top-level await
        await result


# Run mode


async def run_code(code: str, stdin: list[str] | None = None, filename: str = "main.py") -> dict:
    """Run a program as __main__ in a fresh namespace and capture what it printed."""
    _register_source(filename, code)
    out, err = io.StringIO(), io.StringIO()
    started = time.perf_counter()
    status, error = "ok", None
    feed = _Feed(stdin) if stdin is not None else _NoInput()
    namespace = {"__name__": "__main__", "__file__": filename, "__builtins__": builtins}
    try:
        code_obj = compile(code, filename, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err), _patched_input(feed):
            await _execute(code_obj, namespace)
    except SystemExit as exc:
        if exc.code not in (None, 0):
            status, error = "error", {
                "type": "SystemExit",
                "message": f"exit code {exc.code}",
                "line": None,
                "traceback": f"SystemExit: {exc.code}",
            }
    except BaseException as exc:  # noqa: BLE001 — everything the learner raises is reported
        status, error = "error", _describe_exception(exc, files=(filename,))
    return {
        "status": status,
        "stdout": _clip(out.getvalue()),
        "stderr": _clip(err.getvalue()),
        "error": error,
        "durationMs": round((time.perf_counter() - started) * 1000),
    }


# Grade mode


def _find_frame(tb: types.TracebackType | None, filename: str):
    frame = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == filename:
            frame = (tb.tb_frame, tb.tb_lineno)
        tb = tb.tb_next
    return frame


_OPS = {
    ast.Eq: "==",
    ast.NotEq: "!=",
    ast.Lt: "<",
    ast.LtE: "<=",
    ast.Gt: ">",
    ast.GtE: ">=",
    ast.Is: "is",
    ast.IsNot: "is not",
    ast.In: "in",
    ast.NotIn: "not in",
}


async def _evaluate(node: ast.expr, env: dict) -> object:
    value = eval(
        compile(ast.Expression(node), "tests.py", "eval", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT), env
    )
    if inspect.iscoroutine(value):
        value = await value
    return value


def _subject(node: ast.expr) -> tuple[str, str]:
    """How to name the checked value: ("Your program", "printed") for run_program output."""
    src = ast.unparse(node)
    if "run_program(" in src:
        return "Your program", "printed"
    if isinstance(node, ast.Await):
        return src.removeprefix("await "), "returned"
    return src, "returned" if isinstance(node, ast.Call) else "is"


async def _explain_assertion(exc: AssertionError, tests_tree: ast.Module) -> str:
    """Turn a bare `assert a == b` failure into 'a returned X, expected Y'."""
    if exc.args and str(exc.args[0]):
        return str(exc.args[0])
    found = _find_frame(exc.__traceback__, "tests.py")
    if found is None:
        return "An assertion failed"
    frame, lineno = found
    node = next(
        (
            n
            for n in ast.walk(tests_tree)
            if isinstance(n, ast.Assert) and n.lineno <= lineno <= (n.end_lineno or n.lineno)
        ),
        None,
    )
    if node is None:
        return "An assertion failed"
    test = node.test
    if isinstance(test, ast.Compare) and len(test.ops) == 1:
        left_src = ast.unparse(test.left)
        right_src = ast.unparse(test.comparators[0])
        op = _OPS.get(type(test.ops[0]), "?")
        try:
            env = {**frame.f_globals, **frame.f_locals}
            with contextlib.redirect_stdout(io.StringIO()):
                left = await _evaluate(test.left, env)
                right = await _evaluate(test.comparators[0], env)
        except Exception:
            return f"Expected {left_src} {op} {right_src}"
        subject, verb = _subject(test.left)
        if op == "==":
            return f"{subject} {verb} {_short_repr(left)}, expected {_short_repr(right)}"
        if op == "!=":
            return f"{subject} {verb} {_short_repr(left)}, which it shouldn't be"
        if op in ("in", "not in"):
            container = "your program's output" if "run_program(" in right_src else right_src
            return f"Expected {_short_repr(left)} {op} {container}"
        return f"Expected {left_src} {op} {_short_repr(right)}, but it {verb} {_short_repr(left)}"
    if isinstance(test, ast.Call):
        return f"Expected {ast.unparse(test)} to be true"
    if isinstance(test, ast.UnaryOp) and isinstance(test.op, ast.Not):
        return f"Expected {ast.unparse(test.operand)} to be false"
    return f"Check failed: {ast.unparse(test)}"


def _fresh_module(name: str, filename: str, source: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__file__ = filename
    module.__builtins__ = builtins
    _register_source(filename, source)
    return module


async def run_tests(solution: str, tests: str, import_solution: bool = True) -> dict:
    """Import the learner's code as `solution`, then run every registered test.

    Program drills pass import_solution=False: their code is a script (it calls
    input() at the top level), so tests only run it through plp.run_program().
    Its syntax is still checked up front.
    """
    plp._REGISTRY.clear()
    plp._SOLUTION.update(source=solution, filename="solution.py")
    for name in ("solution", "tests"):
        sys.modules.pop(name, None)

    started = time.perf_counter()
    load_out = io.StringIO()

    # 1. The learner's code
    module = _fresh_module("solution", "solution.py", solution)
    try:
        code_obj = compile(solution, "solution.py", "exec")
        if import_solution:
            sys.modules["solution"] = module
            with contextlib.redirect_stdout(load_out), _patched_input(_NoInput()):
                exec(code_obj, module.__dict__)
    except BaseException as exc:  # noqa: BLE001
        sys.modules.pop("solution", None)
        return {
            "status": "error",
            "phase": "solution",
            "stdout": _clip(load_out.getvalue()),
            "error": _describe_exception(exc, files=("solution.py",)),
            "tests": [],
            "durationMs": round((time.perf_counter() - started) * 1000),
        }

    # 2. The drill's tests (errors here are the author's, not the learner's)
    tests_module = _fresh_module("tests", "tests.py", tests)
    try:
        tests_tree = ast.parse(tests, "tests.py")
        exec(compile(tests_tree, "tests.py", "exec"), tests_module.__dict__)
    except BaseException as exc:  # noqa: BLE001
        # An ImportError naming something the learner was asked to define is theirs to fix
        missing = isinstance(exc, ImportError) and getattr(exc, "name", None) == "solution"
        error = _describe_exception(exc, files=("tests.py",))
        if missing:
            error["message"] = str(exc).replace(" (solution.py)", "")
        return {
            "status": "error",
            "phase": "solution" if missing else "tests",
            "stdout": _clip(load_out.getvalue()),
            "error": error,
            "tests": [],
            "durationMs": round((time.perf_counter() - started) * 1000),
        }

    # 3. Each test, with its own output capture
    results = []
    for entry in list(plp._REGISTRY):
        out = io.StringIO()
        t0 = time.perf_counter()
        passed, message, error = False, None, None
        try:
            with contextlib.redirect_stdout(out), _patched_input(_NoInput()):
                outcome = entry["fn"]()
                if inspect.isawaitable(outcome):
                    await outcome
            passed = True
        except AssertionError as exc:
            message = await _explain_assertion(exc, tests_tree)
        except BaseException as exc:  # noqa: BLE001
            error = _describe_exception(exc, files=("solution.py",))
            where = f" (line {error['line']})" if error["line"] else ""
            if error["line"] is not None:
                message = f"Your code raised {error['type']}{where}: {error['message']}"
            else:
                # Raised in the test itself, usually while inspecting what the code returned
                message = f"{error['type']} while checking your result: {error['message']}"
            message = message.rstrip(": ")
        results.append(
            {
                "name": entry["name"],
                "hidden": entry["hidden"],
                "passed": passed,
                "message": message,
                "error": error,
                "stdout": _clip(out.getvalue(), 4_000),
                "durationMs": round((time.perf_counter() - t0) * 1000),
            }
        )

    if not results:
        return {
            "status": "error",
            "phase": "tests",
            "stdout": _clip(load_out.getvalue()),
            "error": {
                "type": "NoTests",
                "message": "tests.py registered no tests",
                "line": None,
                "traceback": "",
            },
            "tests": [],
            "durationMs": round((time.perf_counter() - started) * 1000),
        }

    return {
        "status": "ok",
        "phase": "tests",
        "stdout": _clip(load_out.getvalue()),
        "error": None,
        "tests": results,
        "passed": all(r["passed"] for r in results),
        "durationMs": round((time.perf_counter() - started) * 1000),
    }


def to_json(result: dict) -> str:
    import json

    return json.dumps(result)


# Keep the event loop importable for callers that need it
__all__ = ["run_code", "run_tests", "to_json", "asyncio"]
