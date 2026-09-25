from collections import deque


def moving_average(values, window):
    """The average of every window consecutive values, rounded to 1 decimal place."""
    recent = deque(maxlen=window)
    averages = []
    for value in values:
        recent.append(value)
        if len(recent) == window:
            averages.append(round(sum(recent) / window, 1))
    return averages
