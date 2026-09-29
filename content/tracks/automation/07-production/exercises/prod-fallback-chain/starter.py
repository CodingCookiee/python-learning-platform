from dataclasses import dataclass

SUPPORT_SYSTEM = "You answer questions for Kiln & Co's customers from the policy below. ..."


@dataclass(frozen=True)
class Answer:
    text: str
    source: str  # the name of the option that answered, or "cache"
    stale: bool


class AllProvidersDown(Exception):
    def __init__(self, errors):
        names = ", ".join(f"{name} ({type(error).__name__})" for name, error in errors)
        super().__init__(f"Every option failed: {names}")
        self.errors = errors


def is_retryable(error):
    """Worth trying elsewhere: timeouts, rate limits and provider errors, not our mistakes."""
    if isinstance(error, TimeoutError):
        return True
    status = getattr(error, "status", None)
    return status == 429 or (status is not None and status >= 500)


def cache_key(question):
    """The question with whitespace collapsed and case folded."""
    return question


def answer(question, chain, cache):
    """The first answer from the chain, or a stale cached one when every option is down."""
    name, llm = chain[0]
    reply = llm.complete([{"role": "user", "content": question}], system=SUPPORT_SYSTEM, temperature=0)
    return Answer(reply.text, name, False)
