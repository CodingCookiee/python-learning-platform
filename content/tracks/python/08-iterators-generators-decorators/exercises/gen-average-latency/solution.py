from collections import deque


def average_latency(window=None):
    """A coroutine: send it response times, get back the running average."""
    readings = deque(maxlen=window)
    average = None
    while True:
        reading = yield average
        readings.append(reading)
        average = round(sum(readings) / len(readings), 1)
