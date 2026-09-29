import time


# Profile: a frozen dataclass with result, wall_seconds, cpu_seconds and kind


def profile(job, *args, wall_clock=time.perf_counter, cpu_clock=time.process_time, **kwargs):
    """Run job(*args, **kwargs) and return a Profile of how long it took."""
    ...
