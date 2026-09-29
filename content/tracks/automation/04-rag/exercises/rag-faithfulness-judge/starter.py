import json
from dataclasses import dataclass, field

JUDGE_SYSTEM = (
    "You check whether an answer is supported by its sources. List every claim in the answer "
    "that the sources don't state or directly imply. Reply with JSON only, in the form "
    '{"unsupported": ["claim", ...]}, with an empty list if everything is supported.'
)


@dataclass
class Verdict:
    faithful: bool
    unsupported: list[str] = field(default_factory=list)


def judge_faithfulness(llm, answer, sources):
    """Ask a judge model which claims in the answer its sources don't support."""
    ...
