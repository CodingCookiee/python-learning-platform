import inspect
import re

from pydantic import BaseModel


def tool_from_model(model_cls):
    """A neutral tool definition built from a Pydantic model of the tool's arguments."""
    return {"name": model_cls.__name__, "description": model_cls.__doc__, "parameters": model_cls.model_json_schema()}
