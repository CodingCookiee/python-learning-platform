import json
from dataclasses import dataclass

ROUTER_SYSTEM = """Answer the customer's question from Kiln & Co's policy.
Reply with only JSON: {"answer": "<the answer>", "confidence": <0.0 to 1.0>}"""


@dataclass(frozen=True)
class Routed:
    answer: str
    model: str
    escalated: bool
    needs_review: bool


class RoutingFailed(Exception):
    """No model gave a usable reply."""


def parse_reply(text):
    """(answer, confidence) from a router reply, or None if it isn't usable."""
    try:
        data = json.loads(text)
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    answer, confidence = data.get("answer"), data.get("confidence")
    if not isinstance(answer, str) or not answer.strip():
        return None
    if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        return None
    return answer, float(confidence)


def route(llm, question, *, threshold=0.7, models=("model-small", "model-large")):
    """The first model's answer that's confident enough, escalating through models in order."""
    fallback = None
    for index, model in enumerate(models):
        reply = llm.complete([{"role": "user", "content": question}], system=ROUTER_SYSTEM, model=model, temperature=0)
        parsed = parse_reply(reply.text)
        if parsed is None:
            continue
        answer, confidence = parsed
        if confidence >= threshold:
            return Routed(answer, model, escalated=index > 0, needs_review=False)
        fallback = Routed(answer, model, escalated=index > 0, needs_review=True)
    if fallback is None:
        raise RoutingFailed(f"No usable reply from {', '.join(models)}")
    return fallback
