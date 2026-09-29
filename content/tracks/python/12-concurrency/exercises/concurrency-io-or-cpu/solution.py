def classify(cpu_seconds, wall_seconds):
    """"cpu-bound", "io-bound" or "mixed", from the share of wall time spent on the CPU."""
    busy = cpu_seconds / wall_seconds
    if busy >= 0.8:
        return "cpu-bound"
    if busy <= 0.2:
        return "io-bound"
    return "mixed"
