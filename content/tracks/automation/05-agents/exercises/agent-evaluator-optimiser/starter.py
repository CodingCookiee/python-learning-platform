import json
from dataclasses import dataclass

WRITER_SYSTEM = "You write short, specific cold emails for Northwind's sales team. No hype, one clear ask."
JUDGE_SYSTEM = ('You score cold emails from 0 to 10 for specificity, brevity and a clear ask. '
                'Reply with JSON only: {"score": <int>, "feedback": "<one sentence>"}.')


@dataclass
class Best:
    text: str
    score: int
    rounds: int


def write_prompt(brief):
    return f"Write a cold email.\n\nBrief: {brief}"


def judge_prompt(brief, draft):
    return f"Brief: {brief}\n\nEmail:\n{draft}"


def improve_prompt(brief, draft, feedback):
    return f"Improve this cold email.\n\nBrief: {brief}\n\nFeedback: {feedback}\n\nEmail:\n{draft}"


def optimise(writer, judge, brief, *, threshold=8, max_rounds=3):
    """Write, score, improve; stop at the threshold, and return the best draft seen."""
    ...
