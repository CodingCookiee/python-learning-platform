import cProfile
import pstats


def most_called(fn, *args, n=3):
    """The n Python functions called most often while running fn(*args), as (name, calls)."""
    profiler = cProfile.Profile()
    profiler.runcall(fn, *args)
    profiles = pstats.Stats(profiler).get_stats_profile().func_profiles
    counts = [
        (name, int(profile.ncalls.split("/")[0]))
        for name, profile in profiles.items()
        if profile.file_name != "~"
    ]
    counts.sort(key=lambda item: (-item[1], item[0]))
    return counts[:n]
