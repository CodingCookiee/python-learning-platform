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


def describe_parameters(signature: inspect.Signature) -> str:
    return ", ".join(
        name if parameter.default is inspect.Parameter.empty else f"{name} (optional)"
        for name, parameter in signature.parameters.items()
    )


def agent_tool(max_chars: int = 2000):
    """Decorator: the function checks its arguments, never raises, and returns a clipped string."""

    def decorate(fn):
        signature = inspect.signature(fn)
        name = fn.__name__

        @functools.wraps(fn)
        def tool(**arguments) -> str:
            try:
                signature.bind(**arguments)
            except TypeError:
                content = json.dumps({"error": f"{name} takes {describe_parameters(signature)}. "
                                               f"You passed: {', '.join(arguments)}."})
                return clip(content, max_chars)
            try:
                result = fn(**arguments)
            except ToolError as error:
                result = {"error": str(error)}
            except Exception as error:
                logger.warning("Tool %s failed: %r", name, error)
                result = {"error": f"{name} failed unexpectedly. Don't retry it with the same arguments."}
            content = result if isinstance(result, str) else json.dumps(result, default=str)
            return clip(content, max_chars)

        return tool

    return decorate
