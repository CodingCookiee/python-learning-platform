"""pylearn runner: executes learner code and drill tests, returns JSON-ready results.

Shared by the browser worker (public/workers/python-worker.mjs) and the content
validator (scripts/content), so a drill behaves identically in both.

    await run_code(code, stdin=None)            -> run mode: output of the program
    await run_tests(solution, tests)            -> grade mode: one result per test
"""

from __future__ import annotations

import ast
import asyncio
import builtins
import contextlib
import importlib.abc
import importlib.util
import inspect
import io
import linecache
import os
import sys
import time
import traceback
import types

import plp

MAX_OUTPUT = 20_000
MAX_REPR = 300
USER_FILES = ("main.py", "solution.py")
# The per-test time limit watches the learner's code and the drill's own test code
# (so a test that eagerly drains an endless generator it defines still fails cleanly).
# plp helpers, pytest, mypy and packages are never traced.
TRACED_FILES = (*USER_FILES, "tests.py")

# Multi-file drills: the learner's other files for the current run. .py files are served
# to the import system from memory under their own names (so `import utils` works and
# tracebacks say utils.py); anything else (a CSV, a config) is written to the working
# directory for the code to open. _traced is what the time limit watches this run.
_traced: set[str] = set(TRACED_FILES)
_extra_py: dict[str, str] = {}
_extra_data: list[str] = []


# Helpers


def _register_source(filename: str, source: str) -> None:
    """Make tracebacks show source lines for code that never touched the disk."""
    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)


class _FilesLoader(importlib.abc.Loader):
    def __init__(self, filename: str):
        self.filename = filename

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        source = _extra_py[self.filename]
        module.__file__ = self.filename
        _register_source(self.filename, source)
        exec(compile(source, self.filename, "exec", dont_inherit=True), module.__dict__)

    def get_source(self, fullname):
        return _extra_py[self.filename]


class _FilesFinder(importlib.abc.MetaPathFinder):
    # plp.pytest_run steps around this finder, so files it writes to disk win
    plp_learner_files = True

    def find_spec(self, fullname, path=None, target=None):
        if not _extra_py:
            return None
        rel = fullname.replace(".", "/")
        for candidate, is_package in ((f"{rel}.py", False), (f"{rel}/__init__.py", True)):
            if candidate in _extra_py:
                spec = importlib.util.spec_from_loader(fullname, _FilesLoader(candidate), is_package=is_package)
                spec.origin = candidate
                spec.has_location = True
                if is_package:
                    spec.submodule_search_locations = [rel]
                return spec
        return None


sys.meta_path.insert(0, _FilesFinder())


def _install_files(files: dict[str, str] | None, main: str) -> tuple[str, ...]:
    """Make the learner's other files visible to this run; returns every learner filename."""
    for p in _extra_data:
        with contextlib.suppress(OSError):
            os.remove(p)
    _extra_data.clear()
    _extra_py.clear()
    for raw, source in (files or {}).items():
        path = raw.replace("\\", "/").lstrip("/")
        if not path or ".." in path.split("/") or path == main:
            continue
        if path.endswith(".py"):
            _extra_py[path] = source
            _register_source(path, source)
        else:
            if os.path.dirname(path):
                os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(source)
            _extra_data.append(path)
    _traced.clear()
    _traced.update(TRACED_FILES, (main,), _extra_py)
    importlib.invalidate_caches()
    return (main, *_extra_py)


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


_FRAME = __import__("re").compile(r'^(?P<prefix>[\s|]*)File "(?P<file>[^"]+)", line \d+')


def _full_traceback(exc: BaseException, files: tuple[str, ...]) -> str:
    """The whole traceback, including "The above exception was the direct cause…" chains
    and exception-group trees, with frames outside the learner's files removed."""
    lines = "".join(traceback.format_exception(exc)).splitlines()
    kept: list[str] = []
    skipping_indent: int | None = None
    for line in lines:
        m = _FRAME.match(line)
        if m:
            skipping_indent = None if m.group("file") in files else len(m.group("prefix"))
            if skipping_indent is None:
                kept.append(line)
            continue
        if skipping_indent is not None:
            # Source lines and carets under a dropped frame are indented deeper than it
            stripped = line.lstrip(" |")
            depth = len(line) - len(stripped)
            if stripped and depth > skipping_indent:
                continue
            skipping_indent = None
        kept.append(line)
    # "Traceback (most recent call last):" headers with no frames left under them read oddly
    out: list[str] = []
    for i, line in enumerate(kept):
        nxt = kept[i + 1] if i + 1 < len(kept) else ""
        if line.strip().endswith("Traceback (most recent call last):") and not _FRAME.match(nxt):
            continue
        out.append(line)
    return "\n".join(out)


def _describe_exception(exc: BaseException, *, files: tuple[str, ...] = USER_FILES) -> dict:
    """A traceback trimmed to the learner's own frames."""
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in files]
    line = None
    if isinstance(exc, SyntaxError) and exc.filename in files:
        line = exc.lineno
    elif frames:
        line = frames[-1].lineno
    chained = exc.__cause__ is not None or (exc.__context__ is not None and not exc.__suppress_context__)
    if chained or isinstance(exc, BaseExceptionGroup):
        text = _full_traceback(exc, files)
    else:
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


async def run_code(
    code: str, stdin: list[str] | None = None, filename: str = "main.py", files: dict[str, str] | None = None
) -> dict:
    """Run a program as __main__ in a fresh namespace and capture what it printed."""
    _register_source(filename, code)
    out, err = io.StringIO(), io.StringIO()
    started = time.perf_counter()
    status, error = "ok", None
    feed = _Feed(stdin) if stdin is not None else _NoInput()
    _reset_user_state()
    user_files = _install_files(files, filename)
    plp.browser_compat()
    try:
        # dont_inherit: this file's own `from __future__ import annotations` must not leak into
        # learner code (it would turn their annotations into strings)
        code_obj = compile(code, filename, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True)
        with (
            contextlib.redirect_stdout(out),
            contextlib.redirect_stderr(err),
            _patched_input(feed),
            plp.as_module("__main__", filename) as namespace,
        ):
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
        status, error = "error", _describe_exception(exc, files=user_files)
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
        compile(ast.Expression(node), "tests.py", "eval", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True), env
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


def _assert_fail(left, right, op: str, left_src: str, right_src: str, kind: str, msg) -> AssertionError:
    """Build the message for a rewritten `assert L op R` from the values the test already computed."""
    if msg is not None and str(msg):
        return AssertionError(str(msg))
    if kind == "program":
        subject, verb = "Your program", "printed"
    elif kind in ("call", "await"):
        subject, verb = left_src.removeprefix("await "), "returned"
    else:
        subject, verb = left_src, "is"
    if op == "==":
        text = f"{subject} {verb} {_short_repr(left)}, expected {_short_repr(right)}"
    elif op == "!=":
        text = f"{subject} {verb} {_short_repr(left)}, which it shouldn't be"
    elif op in ("in", "not in"):
        container = "your program's output" if "run_program(" in right_src else right_src
        text = f"Expected {_short_repr(left)} {op} {container}"
    else:
        text = f"Expected {left_src} {op} {_short_repr(right)}, but it {verb} {_short_repr(left)}"
    return AssertionError(text)


class _AssertRewriter(ast.NodeTransformer):
    """Rewrite `assert L op R[, msg]` so both sides are evaluated exactly once:

        _plp_l = L
        _plp_r = R
        if not (_plp_l op _plp_r):
            raise _plp_assert_fail(_plp_l, _plp_r, "op", "L", "R", kind, msg)

    Re-running the learner's code to explain a failure would repeat side effects
    (mutation, printing) and could report different values than the ones checked.
    """

    def visit_Assert(self, node: ast.Assert):
        test = node.test
        # `assert A and B` → `assert A` then `assert B`: same short-circuit, and each half explains itself
        if isinstance(test, ast.BoolOp) and isinstance(test.op, ast.And):
            parts = [ast.copy_location(ast.Assert(test=value, msg=node.msg), node) for value in test.values]
            out = []
            for part in parts:
                result = self.visit_Assert(part)
                out.extend(result if isinstance(result, list) else [result])
            return out
        if not (isinstance(test, ast.Compare) and len(test.ops) == 1):
            return node
        left_src = ast.unparse(test.left)
        right_src = ast.unparse(test.comparators[0])
        kind = (
            "program"
            if "run_program(" in left_src
            else "await"
            if isinstance(test.left, ast.Await)
            else "call"
            if isinstance(test.left, ast.Call)
            else "value"
        )
        load = lambda name: ast.Name(id=name, ctx=ast.Load())  # noqa: E731
        stmts = [
            ast.Assign(targets=[ast.Name(id="_plp_l", ctx=ast.Store())], value=test.left),
            ast.Assign(targets=[ast.Name(id="_plp_r", ctx=ast.Store())], value=test.comparators[0]),
            ast.If(
                test=ast.UnaryOp(
                    op=ast.Not(),
                    operand=ast.Compare(left=load("_plp_l"), ops=test.ops, comparators=[load("_plp_r")]),
                ),
                body=[
                    ast.Raise(
                        exc=ast.Call(
                            func=load("_plp_assert_fail"),
                            args=[
                                load("_plp_l"),
                                load("_plp_r"),
                                ast.Constant(_OPS.get(type(test.ops[0]), "?")),
                                ast.Constant(left_src),
                                ast.Constant(right_src),
                                ast.Constant(kind),
                                node.msg or ast.Constant(None),
                            ],
                            keywords=[],
                        ),
                        cause=None,
                    )
                ],
                orelse=[],
            ),
        ]
        # Release both sides at once, so weakref and refcount tests see objects freed
        stmts.append(
            ast.Assign(
                targets=[ast.Name(id="_plp_l", ctx=ast.Store()), ast.Name(id="_plp_r", ctx=ast.Store())],
                value=ast.Constant(None),
            )
        )
        for stmt in stmts:
            ast.copy_location(stmt, node)
        return stmts


# Per-test time limits, enforced only inside the learner's own code

DEFAULT_TEST_TIMEOUT = 2.0
IMPORT_TIMEOUT = 3.0
# Frameworks that do heavy lazy setup the first time a learner's module uses them
# (FastAPI builds route models, pandas and SQLAlchemy compile internals). Files that
# import one get more time to load; an infinite loop at import time still fails.
HEAVY_IMPORTS = {"fastapi", "starlette", "pandas", "sqlalchemy", "numpy", "pydantic", "scipy", "sklearn", "matplotlib"}
HEAVY_IMPORT_TIMEOUT = 10.0


def _import_budget(source: str) -> float:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return IMPORT_TIMEOUT
    for node in tree.body:
        names = (
            [a.name for a in node.names]
            if isinstance(node, ast.Import)
            else [node.module]
            if isinstance(node, ast.ImportFrom) and node.module
            else []
        )
        if any(n.split(".")[0] in HEAVY_IMPORTS for n in names):
            return HEAVY_IMPORT_TIMEOUT
    return IMPORT_TIMEOUT


class _Deadline:
    """A sys.settrace tracer that raises plp.TestTimeout once learner code runs past a deadline.

    Only frames from solution.py (and main.py) are traced, so test helpers, pytest,
    mypy and imported packages run at full speed and never count against the limit.
    """

    def __init__(self):
        self.until: float | None = None
        self.seconds = 0.0

    def start(self, seconds: float | None):
        self.seconds = seconds or 0.0
        self.until = None if seconds is None else time.perf_counter() + seconds
        sys.settrace(self._global if seconds is not None else None)

    def stop(self):
        sys.settrace(None)
        self.until = None

    @contextlib.contextmanager
    def paused(self):
        """Time spent in heavy grading helpers (pytest, mypy) doesn't count against the test."""
        if self.until is None:
            yield
            return
        started = time.perf_counter()
        remaining = self.until - started
        self.until = None
        sys.settrace(None)
        try:
            yield
        finally:
            self.until = time.perf_counter() + remaining
            sys.settrace(self._global)

    def _global(self, frame, event, arg):
        if frame.f_code.co_filename in _traced:
            return self._local
        return None

    def _local(self, frame, event, arg):
        if event == "line" and self.until is not None and time.perf_counter() > self.until:
            self.until = None
            raise plp.TestTimeout(
                f"Took longer than {self.seconds:g}s. Look for a loop that never ends, or code that is far too slow."
            )
        return self._local


_deadline = _Deadline()
plp._untimed = _deadline.paused  # plp helpers wrap heavy work in this


# The worker lives across runs; modules the learner's code created or imported from its
# own files must not leak into the next run (packages and the stdlib stay cached).
_BASELINE_PATH = list(sys.path)
_KEEP_PREFIXES = ("/lib/", "/usr/", "/home/pyodide/_plp/")


def _reset_user_state() -> None:
    for name, module in list(sys.modules.items()):
        if name in ("__main__", "plp", "plp_runner", "plp_fakes"):
            continue
        path = getattr(module, "__file__", None) or ""
        spec = getattr(module, "__spec__", None)
        user_made = (
            (path and not path.startswith(_KEEP_PREFIXES) and not path.startswith(sys.prefix))
            or (spec is None and not path and name in ("solution", "tests"))
        )
        if user_made:
            sys.modules.pop(name, None)
    sys.path[:] = [p for p in sys.path if p in _BASELINE_PATH] + [p for p in _BASELINE_PATH if p not in sys.path]
    import importlib

    importlib.invalidate_caches()


def _preimport(source: str) -> None:
    """Import the libraries a learner's file imports at the top level, before any time
    limit starts: a cold `import pandas` or SQLAlchemy takes seconds in the browser and
    isn't the learner's code. Failures are ignored; the real import reports them."""
    import importlib

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return
    for node in tree.body:
        names: list[str] = []
        if isinstance(node, ast.Import):
            names = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names = [node.module]
        for name in names:
            if name.split(".")[0] in ("solution", "tests"):
                continue
            try:
                with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                    importlib.import_module(name)
            except BaseException:  # noqa: BLE001 — the learner's own import will report it
                pass


def _fresh_module(name: str, filename: str, source: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__file__ = filename
    module.__builtins__ = builtins
    _register_source(filename, source)
    return module


async def run_tests(
    solution: str,
    tests: str,
    import_solution: bool = True,
    files: dict[str, str] | None = None,
    main_name: str = "solution.py",
) -> dict:
    """Import the learner's code as `solution`, then run every registered test.

    Program drills pass import_solution=False: their code is a script (it calls
    input() at the top level), so tests only run it through plp.run_program().
    Its syntax is still checked up front.

    Multi-file drills pass their other files in `files` (path -> source) and the
    main file's name in `main_name` (it's still imported as `solution`).
    """
    plp._REGISTRY.clear()
    plp._SOLUTION.update(source=solution, filename=main_name)
    _reset_user_state()
    user_files = _install_files(files, main_name)
    plp._SOLUTION["files"] = {path: text for path, text in (files or {}).items() if path != main_name}
    plp.fresh_logging()
    plp.browser_compat()
    for name in ("solution", "tests"):
        sys.modules.pop(name, None)

    started = time.perf_counter()
    load_out = io.StringIO()

    # 1. The learner's code
    module = _fresh_module("solution", main_name, solution)
    try:
        code_obj = compile(solution, main_name, "exec", dont_inherit=True)
        if import_solution:
            sys.modules["solution"] = module
            _preimport(solution)
            for extra in _extra_py.values():
                _preimport(extra)
            with contextlib.redirect_stdout(load_out), _patched_input(_NoInput()):
                _deadline.start(_import_budget(solution))
                try:
                    exec(code_obj, module.__dict__)
                finally:
                    _deadline.stop()
    except BaseException as exc:  # noqa: BLE001
        sys.modules.pop("solution", None)
        return {
            "status": "error",
            "phase": "solution",
            "stdout": _clip(load_out.getvalue()),
            "error": _describe_exception(exc, files=user_files),
            "tests": [],
            "durationMs": round((time.perf_counter() - started) * 1000),
        }

    # 2. The drill's tests (errors here are the author's, not the learner's)
    tests_module = _fresh_module("tests", "tests.py", tests)
    sys.modules["tests"] = tests_module  # @dataclass, pickling and typing look modules up here
    tests_module.__dict__["_plp_assert_fail"] = _assert_fail
    try:
        tests_tree = ast.parse(tests, "tests.py")
        rewritten = ast.fix_missing_locations(_AssertRewriter().visit(ast.parse(tests, "tests.py")))
        exec(compile(rewritten, "tests.py", "exec", dont_inherit=True), tests_module.__dict__)
    except BaseException as exc:  # noqa: BLE001
        # An ImportError naming something the learner was asked to define is theirs to fix
        missing = isinstance(exc, ImportError) and getattr(exc, "name", None) == "solution"
        error = _describe_exception(exc, files=("tests.py",))
        if missing:
            error["message"] = str(exc).replace(f" ({main_name})", "")
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
        plp.fresh_logging()
        try:
            with contextlib.redirect_stdout(out), _patched_input(_NoInput()):
                _deadline.start(entry.get("timeout", DEFAULT_TEST_TIMEOUT))
                try:
                    outcome = entry["fn"]()
                    if inspect.isawaitable(outcome):
                        # A coroutine can hang on an await that never resolves, where no
                        # line runs for the tracer to notice; asyncio.timeout catches that
                        limit = entry.get("timeout", DEFAULT_TEST_TIMEOUT)
                        if limit is None:
                            await outcome
                        else:
                            try:
                                async with asyncio.timeout(limit):
                                    await outcome
                            except TimeoutError as exc:
                                raise plp.TestTimeout(
                                    f"Took longer than {limit:g}s. Look for an await that never finishes "
                                    "(a queue nobody fills, a task nobody finishes) or a loop that never ends."
                                ) from exc
                finally:
                    _deadline.stop()
            passed = True
        except AssertionError as exc:
            message = await _explain_assertion(exc, tests_tree)
        except plp.TestTimeout as exc:
            error = _describe_exception(exc, files=user_files)
            where = f" It was running line {error['line']} when it stopped." if error["line"] else ""
            message = f"{exc}{where}"
        except BaseException as exc:  # noqa: BLE001
            error = _describe_exception(exc, files=user_files)
            where = f" (line {error['line']})" if error["line"] else ""
            if error["line"] is not None:
                message = f"Your code raised {error['type']}{where}: {error['message']}"
            else:
                # Raised in the test itself, while using what the learner's code returned
                # (e.g. calling a method it lacks, or using it in a `with` it doesn't support)
                message = f"{error['type']}: {error['message']} (raised while the test was using your code)"
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
