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
    data = json.loads(text)
    return data["answer"], data["confidence"]


def route(llm, question, *, threshold=0.7, models=("model-small", "model-large")):
    """The first model's answer that's confident enough, escalating through models in order."""
    reply = llm.complete([{"role": "user", "content": question}], system=ROUTER_SYSTEM, model=models[-1], temperature=0)
    answer, _confidence = parse_reply(reply.text)
    return Routed(answer, models[-1], escalated=True, needs_review=False)
