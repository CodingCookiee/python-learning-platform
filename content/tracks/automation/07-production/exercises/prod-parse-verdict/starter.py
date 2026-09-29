import json
from dataclasses import dataclass


class JudgeError(ValueError):
    """The judge's reply isn't a usable verdict."""


@dataclass(frozen=True)
class Verdict:
    reason: str
    score: int


def parse_verdict(text):
    """The Verdict in a judge's reply, or JudgeError."""
    data = json.loads(text)
    return Verdict(data["reason"], data["score"])
