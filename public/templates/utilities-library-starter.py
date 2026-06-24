# Framework Utilities Library - Starter Template

"""Starter scaffold for the Module 9 utilities library project."""

from __future__ import annotations

import functools
import logging
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, Generator, TypeVar

T = TypeVar("T")


def setup_logging() -> None:
    """Configure basic logging for the library."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def timing(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator that logs how long a function takes to run."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        logging.info("%s took %.3fs", func.__name__, elapsed)
        return result

    return wrapper


def retry(retries: int = 3, delay: float = 0.5) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator that retries a function when it raises an exception."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_error: Exception | None = None
            for attempt in range(1, retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:  # TODO: Narrow exception type for your use case.
                    last_error = exc
                    logging.warning("Attempt %d/%d failed: %s", attempt, retries, exc)
                    if attempt < retries:
                        time.sleep(delay)
            raise last_error or RuntimeError("Retry failed unexpectedly")

        return wrapper

    return decorator


def memoize(func: Callable[..., T]) -> Callable[..., T]:
    """Simple cache decorator for pure functions."""
    cache: dict[tuple[object, ...], T] = {}

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        key = args + tuple(sorted(kwargs.items()))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]

    return wrapper


@contextmanager
def managed_file(path: str | Path, mode: str = "r", encoding: str = "utf-8") -> Generator:
    """Context manager for file operations with logging."""
    file_path = Path(path)
    logging.info("Opening %s", file_path)
    handle = file_path.open(mode, encoding=encoding)
    try:
        yield handle
    finally:
        handle.close()
        logging.info("Closed %s", file_path)


class Formatter:
    """Utility helpers for formatting strings and values."""

    @staticmethod
    def title_case(text: str) -> str:
        return text.strip().title()

    @staticmethod
    def slugify(text: str) -> str:
        return "-".join(part for part in text.lower().split() if part)


def example_usage() -> None:
    """Demonstrate how the utilities can be used."""

    setup_logging()

    @timing
    @retry(retries=2, delay=0.25)
    def sample_task() -> str:
        return "success"

    @memoize
    def add(a: int, b: int) -> int:
        return a + b

    print("=== Framework Utilities Library ===")
    print("Sample task result:", sample_task())
    print("Memoized add:", add(2, 3))
    print("Formatted:", Formatter.title_case("framework utilities library"))


if __name__ == "__main__":
    example_usage()
