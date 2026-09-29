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


def cache_key(question: str) -> str:
    """The question with whitespace collapsed and case folded."""
    return " ".join(question.split()).casefold()


def answer(question: str, chain, cache: dict) -> Answer:
    """The first answer from the chain, or a stale cached one when every option is down."""
    key = cache_key(question)
    errors = []
    for name, llm in chain:
        try:
            reply = llm.complete([{"role": "user", "content": question}], system=SUPPORT_SYSTEM, temperature=0)
        except Exception as error:
            if not is_retryable(error):
                raise
            errors.append((name, error))
            continue
        cache[key] = reply.text
        return Answer(reply.text, name, stale=False)

    if key in cache:
        return Answer(cache[key], "cache", stale=True)
    raise AllProvidersDown(errors)
