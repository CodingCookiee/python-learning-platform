import time
from dataclasses import dataclass


@dataclass(frozen=True)
class Profile:
    result: object
    wall_seconds: float
    cpu_seconds: float
    kind: str


def _kind(cpu_seconds, wall_seconds):
    if wall_seconds == 0:
        return "instant"
    busy = cpu_seconds / wall_seconds
    if busy >= 0.8:
        return "cpu-bound"
    if busy <= 0.2:
        return "io-bound"
    return "mixed"


def profile(job, *args, wall_clock=time.perf_counter, cpu_clock=time.process_time, **kwargs):
    """Run job(*args, **kwargs) and return a Profile of how long it took."""
    wall_start, cpu_start = wall_clock(), cpu_clock()
    result = job(*args, **kwargs)
    wall = round(wall_clock() - wall_start, 3)
    cpu = round(cpu_clock() - cpu_start, 3)
    return Profile(result, wall, cpu, _kind(cpu, wall))
