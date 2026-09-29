import inspect
import re

from pydantic import BaseModel


def snake_case(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def tool_from_model(model_cls: type[BaseModel]) -> dict:
    """A neutral tool definition built from a Pydantic model of the tool's arguments."""
    if not model_cls.__doc__:
        raise ValueError(f"{model_cls.__name__} needs a docstring: it's the tool's description")
    parameters = dict(model_cls.model_json_schema())
    parameters.pop("title", None)
    parameters.pop("description", None)
    return {"name": snake_case(model_cls.__name__), "description": inspect.getdoc(model_cls), "parameters": parameters}
