# Performance Optimization Starter Template

"""Starter scaffold for profiling and optimizing Python code."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from time import perf_counter
from typing import Callable, Iterable, TypeVar

T = TypeVar("T")


@dataclass
class BenchmarkResult:
    """Single benchmark sample with timing and iteration metadata."""

    name: str
    iterations: int
    elapsed_seconds: float

    @property
    def avg_seconds(self) -> float:
        """Return the average time per iteration."""

        if self.iterations <= 0:
            return 0.0
        return self.elapsed_seconds / self.iterations


def benchmark(label: str, iterations: int, func: Callable[[], T]) -> BenchmarkResult:
    """Measure how long a callable takes to run repeatedly."""

    start = perf_counter()
    for _ in range(iterations):
        func()
    elapsed = perf_counter() - start
    return BenchmarkResult(name=label, iterations=iterations, elapsed_seconds=elapsed)


def average(values: Iterable[float]) -> float:
    """Compute a small helper average for performance metrics."""

    items = list(values)
    return mean(items) if items else 0.0


def profile_hot_path(numbers: list[int]) -> dict[str, float]:
    """Example hot path that can be optimized and measured."""

    start = perf_counter()
    total = sum(n * n for n in numbers if n % 2 == 0)
    elapsed = perf_counter() - start
    return {"result": float(total), "elapsed_seconds": elapsed}


def explain_optimization(results: list[BenchmarkResult]) -> str:
    """Render a short human-readable summary of benchmark results."""

    if not results:
        return "No benchmark results available."

    avg_time = average(result.avg_seconds for result in results)
    slowest = max(results, key=lambda result: result.avg_seconds)
    fastest = min(results, key=lambda result: result.avg_seconds)
    return (
        f"Benchmarks completed: {len(results)} samples. "
        f"Average time: {avg_time:.6f}s. "
        f"Fastest: {fastest.name}. "
        f"Slowest: {slowest.name}."
    )


if __name__ == "__main__":
    sample = list(range(10_000))
    hot_path = profile_hot_path(sample)
    summary = benchmark("hot_path", 20, lambda: profile_hot_path(sample))
    print(hot_path)
    print(summary)
    print(explain_optimization([summary]))
