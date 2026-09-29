Discovery calls get better with practice, and a language model makes a patient practice client.
Write `rehearse(llm, persona, questions)`, which plays a whole call against `llm` (any object with
the course's `complete()` interface) and then asks a coach for feedback.

`persona` is a dict with the keys `role`, `business`, `pain`, `budget` and `hidden`, which fill in
the `CLIENT_SYSTEM` template in the starter. `hidden` is a concern the client won't raise unless
you ask the right question.

1. If `questions` is empty, raise `ValueError` without calling the model.
2. **The call.** For each question, add it to the conversation as a user message and call
   `llm.complete(messages, system=<CLIENT_SYSTEM filled in>, temperature=0.7)`. Add the reply's
   text as an assistant message, so each question is asked with the whole conversation so far.
3. **The coach.** Build the transcript, one `You: <question>` line then one `Client: <answer>`
   line per exchange, joined with newlines. Send it as the only user message of a new conversation,
   with `system=COACH_SYSTEM.format(hidden=persona["hidden"])` and `temperature=0`.
4. Return `{"transcript": [(question, answer), ...], "feedback": <the coach's text>}`.

```python
llm = ScriptedLLM([
    "About forty a week, mostly by phone.",
    "Honestly, I'm worried the dentists won't use anything new.",
    "Good: you asked about volume early. Missing: what a no-show costs. You found the concern.",
])
result = rehearse(llm, CLINIC, ["How many reminders do you send?", "What worries you about changing it?"])
result["transcript"][0]
# ("How many reminders do you send?", "About forty a week, mostly by phone.")
```

`CLINIC` is in the tests.
