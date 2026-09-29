REPLY_TEMPLATE = """You write SMS replies to Harbour Bikes customers.

Follow these steps:
1. Work out what the customer is asking for.
2. Answer using only this policy: {policy}
3. If the policy doesn't cover it, say a team member will follow up today.

Write at most {max_words} words. No greeting line, no sign-off, no links."""


def word_count(text):
    return len(text.split())


def draft_support_reply(llm, ticket, *, policy, max_words=60):
    """A reply within max_words, asking the model to shorten it once if needed."""
    system = REPLY_TEMPLATE.format(policy=policy, max_words=max_words)
    messages = [{"role": "user", "content": f"<ticket>\n{ticket}\n</ticket>"}]

    first = llm.complete(messages, system=system, max_tokens=300, temperature=0.3).text.strip()
    if word_count(first) <= max_words:
        return first

    feedback = (
        f"That reply is {word_count(first)} words. "
        f"Rewrite it in at most {max_words} words, keeping the same facts."
    )
    history = [*messages, {"role": "assistant", "content": first}, {"role": "user", "content": feedback}]
    second = llm.complete(history, system=system, max_tokens=300, temperature=0.3).text.strip()
    if word_count(second) <= max_words:
        return second
    raise ValueError(f"The reply is still {word_count(second)} words after a rewrite (limit {max_words})")
