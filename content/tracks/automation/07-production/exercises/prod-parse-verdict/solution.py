import json
from dataclasses import dataclass


class JudgeError(ValueError):
    """The judge's reply isn't a usable verdict."""


@dataclass(frozen=True)
class Verdict:
    reason: str
    score: int


def parse_verdict(text: str) -> Verdict:
    """The Verdict in a judge's reply, or JudgeError."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end < start:
        raise JudgeError(f"No JSON object in the judge's reply: {text[:80]!r}")
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError as error:
        raise JudgeError(f"The judge's JSON is invalid: {error.msg}") from error
    if not isinstance(data, dict):
        raise JudgeError("The verdict must be a JSON object")

    score, reason = data.get("score"), data.get("reason")
    if type(score) is not int or not 1 <= score <= 5:
        raise JudgeError(f"score must be a whole number from 1 to 5, got {score!r}")
    if not isinstance(reason, str) or not reason.strip():
        raise JudgeError("reason must be a non-empty string")
    return Verdict(reason, score)
