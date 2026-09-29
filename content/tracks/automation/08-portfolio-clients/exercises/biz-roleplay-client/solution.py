CLIENT_SYSTEM = """You are role-playing a prospective client on a discovery call with an automation consultant.
You are the {role} at {business}.
Your real problem: {pain}
Your budget: {budget}
A concern you only mention if asked about it directly: {hidden}
Stay in character. Answer only what you are asked, in one to three sentences, and never give advice."""

COACH_SYSTEM = """You coach automation consultants on their discovery calls.
The client's hidden concern was: {hidden}
Read the transcript and give three short points: one thing that went well, one question that was missing, and whether the consultant uncovered the hidden concern."""


def rehearse(llm, persona, questions):
    """Play a discovery call against a role-play client, then get a coach's feedback."""
    if not questions:
        raise ValueError("no questions to rehearse")
    system = CLIENT_SYSTEM.format(**persona)
    messages = []
    transcript = []
    for question in questions:
        messages.append({"role": "user", "content": question})
        reply = llm.complete(messages, system=system, temperature=0.7)
        messages.append({"role": "assistant", "content": reply.text})
        transcript.append((question, reply.text))

    text = "\n".join(f"You: {q}\nClient: {a}" for q, a in transcript)
    review = llm.complete(
        [{"role": "user", "content": text}],
        system=COACH_SYSTEM.format(hidden=persona["hidden"]),
        temperature=0,
    )
    return {"transcript": transcript, "feedback": review.text}
