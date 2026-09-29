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
    if not sources:
        raise ValueError("a faithfulness check needs sources")
    numbered = "\n".join(f"[{n}] {text}" for n, text in enumerate(sources, start=1))
    user = f"<sources>\n{numbered}\n</sources>\n\n<answer>\n{answer}\n</answer>"
    reply = llm.complete([{"role": "user", "content": user}], system=JUDGE_SYSTEM, temperature=0).text
    try:
        data = json.loads(reply)
    except ValueError:
        raise ValueError(f"unreadable judge reply: {reply!r}") from None
    claims = data.get("unsupported") if isinstance(data, dict) else None
    if not isinstance(claims, list) or not all(isinstance(claim, str) for claim in claims):
        raise ValueError(f"unreadable judge reply: {reply!r}")
    claims = [claim.strip() for claim in claims if claim.strip()]
    return Verdict(faithful=not claims, unsupported=claims)
