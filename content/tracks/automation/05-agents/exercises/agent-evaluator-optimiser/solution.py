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


def ask(llm, content, **options):
    return llm.complete([{"role": "user", "content": content}], **options).text


def verdict(reply: str) -> tuple[int, str]:
    try:
        parsed = json.loads(reply)
    except ValueError:
        return 0, ""
    if not isinstance(parsed, dict) or not isinstance(parsed.get("score"), int):
        return 0, ""
    return parsed["score"], str(parsed.get("feedback", ""))


def optimise(writer, judge, brief: str, *, threshold: int = 8, max_rounds: int = 3) -> Best:
    """Write, score, improve; stop at the threshold, and return the best draft seen."""
    draft = ask(writer, write_prompt(brief), system=WRITER_SYSTEM)
    best: tuple[str, int] | None = None
    for round_number in range(1, max_rounds + 1):
        score, feedback = verdict(ask(judge, judge_prompt(brief, draft), system=JUDGE_SYSTEM, temperature=0))
        if best is None or score > best[1]:
            best = (draft, score)
        if score >= threshold:
            return Best(draft, score, round_number)
        if round_number < max_rounds:
            draft = ask(writer, improve_prompt(brief, draft, feedback), system=WRITER_SYSTEM)
    assert best is not None
    return Best(best[0], best[1], max_rounds)
