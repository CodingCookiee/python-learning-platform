from itertools import groupby
from operator import itemgetter


def longest_outage(checks):
    """(start, end, minutes) of the longest run of "down" checks, or None."""
    longest = None
    for status, run in groupby(checks, key=itemgetter(1)):
        if status != "down":
            continue
        run = list(run)
        if longest is None or len(run) > longest[2]:
            longest = (run[0][0], run[-1][0], len(run))
    return longest
