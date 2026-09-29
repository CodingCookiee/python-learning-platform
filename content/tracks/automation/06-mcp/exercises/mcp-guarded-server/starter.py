import math
import time
from collections import deque

WINDOW_SECONDS = 60


def guard(handle, *, allowed_tools: set[str], calls_per_minute: int, clock=time.monotonic):
    """handle, limited to allowed_tools and at most calls_per_minute tool calls per minute."""
    ...
