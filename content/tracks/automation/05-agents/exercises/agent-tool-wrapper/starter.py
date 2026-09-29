import functools
import inspect
import json
import logging

logger = logging.getLogger("research_agent")


class ToolError(Exception):
    """An error whose message is written for the model, e.g. 'No account C-999. Use find_company first.'"""


def clip(text, limit=2000):
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n[cut: showing {limit:,} of {len(text):,} characters. Ask for less: a narrower query or the next page.]"


def agent_tool(max_chars=2000):
    """Decorator: the function checks its arguments, never raises, and returns a clipped string."""
    ...
