from plp_fakes import Fail, ScriptedLLM, Timeout


def is_retryable(error):
    status = getattr(error, "status", None)
    return isinstance(error, TimeoutError) or status == 429 or (status is not None and status >= 500)


def ask(chain, question):
    for name, llm in chain:
        try:
            reply = llm.complete([{"role": "user", "content": question}])
            return f"{name}: {reply.text}"
        except Exception as error:
            if not is_retryable(error):
                return f"gave up at {name}: {error}"
    return "all down: a person will reply"


primary = ScriptedLLM([Fail(529), "Refunds take 14 days.", Fail(400, "prompt is too long"), Timeout()])
secondary = ScriptedLLM([Timeout(), Fail(503)])
cached = ScriptedLLM(["(cached) Refunds take 14 days.", Fail(503)])
chain = [("primary", primary), ("secondary", secondary), ("cached", cached)]

questions = [
    "How long do refunds take?",
    "How long do refunds take?",
    "Summarise this 400-message thread",
    "Where is order 1042?",
]
for question in questions:
    print(ask(chain, question))
print(len(primary.calls), len(secondary.calls), len(cached.calls))
