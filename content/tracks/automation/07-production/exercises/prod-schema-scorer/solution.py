import json
from dataclasses import dataclass

from pydantic import BaseModel, TypeAdapter, ValidationError


@dataclass(frozen=True)
class Score:
    passed: bool
    reason: str


def schema_score(output: str, model: type[BaseModel], expected: dict) -> Score:
    """Pass when the output is valid JSON for model and has the expected field values."""
    try:
        data = json.loads(output)
    except ValueError as error:
        return Score(False, f"not JSON: {error}")
    try:
        record = model.model_validate(data)
    except ValidationError as error:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in item['loc']) or '(root)'}: {item['msg']}" for item in error.errors()
        )
        return Score(False, f"invalid: {problems}")

    wrong = []
    for name, value in expected.items():
        want = TypeAdapter(model.model_fields[name].annotation).validate_python(value)
        got = getattr(record, name)
        if got != want:
            wrong.append(f"{name}: expected {want!r}, got {got!r}")
    if wrong:
        return Score(False, "wrong " + "; ".join(wrong))
    return Score(True, "ok")
