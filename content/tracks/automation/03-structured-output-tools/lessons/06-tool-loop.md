---
slug: tool-loop
title: The tool dispatch loop
summary: Call the model, run the tools it asks for, send the results back, repeat until it answers. Cap the steps, return errors instead of crashing, handle several calls at once, and validate every argument.
minutes: 50
exercises:
  - tools-tool-messages
  - tools-fix-missing-assistant-turn
  - tools-dispatch-loop
  - tools-fix-crashing-tool
  - tools-parallel-validated
---

"Book me in with Dr Patel on Thursday afternoon" takes the clinic's assistant two tool calls:
`find_slots` to see what's free, then `book_appointment` for the slot the patient picked. Each
call is a round trip to the model, and each result changes what the model does next. The code that
drives this is a loop of about twenty lines, and nearly every production bug in tool calling is a
mistake in one of them. This lesson writes the loop, then makes it survive the things models and
tools actually do.

## One round trip, by hand

The drills pass a scripted fake as `llm`. Here a smaller stand-in does the same job, so you can
watch the conversation grow:

```python
from types import SimpleNamespace as Obj   # stands in for LLMResponse and ToolCall

class CannedLLM:
    """Replays canned responses and records each request. The drills use ScriptedLLM."""
    def __init__(self, *responses):
        self.responses, self.calls = list(responses), []
    def complete(self, messages, **options):
        self.calls.append([dict(m) for m in messages])
        return self.responses.pop(0)

call = Obj(id="call_01", name="find_slots", arguments={"practitioner": "Patel", "day": "2026-10-01"})
llm = CannedLLM(
    Obj(text="", tool_calls=[call], stop_reason="tool_use"),
    Obj(text="Dr Patel is free at 14:30 and 16:00 on Thursday.", tool_calls=[], stop_reason="end_turn"),
)

messages = [{"role": "user", "content": "Can I see Dr Patel on Thursday afternoon?"}]
first = llm.complete(messages, tools=["...find_slots..."])
messages.append({
    "role": "assistant",
    "content": first.text,
    "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in first.tool_calls],
})
messages.append({"role": "tool", "tool_call_id": call.id, "content": '["14:30", "16:00"]'})
second = llm.complete(messages, tools=["...find_slots..."])

[m["role"] for m in llm.calls[1]], second.text
```

The second request carries three messages: the patient's question, the model's request to run
`find_slots`, and the result, linked to that request by `tool_call_id`. The response's `ToolCall`
objects become plain dicts in the history, because messages are data your adapters serialise. That's the neutral format
from A2; the adapters turn it into Anthropic's `tool_use` and `tool_result` blocks, or OpenAI's
`tool_calls` and `role: "tool"` messages.

## The loop

Do that until the model stops asking for tools. With a registry that maps tool names to
functions, the whole thing fits on a screen:

```python
from types import SimpleNamespace as Obj

class CannedLLM:
    def __init__(self, *responses):
        self.responses = list(responses)
    def complete(self, messages, **options):
        return self.responses.pop(0)

def find_slots(practitioner, day):
    return ["14:30", "16:00"]

def book_appointment(practitioner, day, time):
    return {"booking_id": "BK-5521", "time": time}

REGISTRY = {"find_slots": find_slots, "book_appointment": book_appointment}
MAX_STEPS = 5

def run(llm, messages):
    messages = list(messages)
    for _step in range(MAX_STEPS):
        response = llm.complete(messages, tools=["...the neutral tool list..."])
        if not response.tool_calls:
            return response.text
        messages.append({
            "role": "assistant",
            "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls],
        })
        for call in response.tool_calls:
            output = REGISTRY[call.name](**call.arguments)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": str(output)})
    raise RuntimeError(f"No answer after {MAX_STEPS} steps")

llm = CannedLLM(
    Obj(text="", tool_calls=[Obj(id="c1", name="find_slots", arguments={"practitioner": "Patel", "day": "Thu"})]),
    Obj(text="", tool_calls=[Obj(id="c2", name="book_appointment",
                                 arguments={"practitioner": "Patel", "day": "Thu", "time": "14:30"})]),
    Obj(text="You're booked with Dr Patel on Thursday at 14:30 (BK-5521).", tool_calls=[]),
)
run(llm, [{"role": "user", "content": "Book me with Dr Patel on Thursday afternoon, earliest slot."}])
```

Four decisions are packed into those lines, and each gets a section below: the assistant message
goes in before the results, the loop has a step cap, a failing tool mustn't crash it, and one
response can hold several calls.

> [!NOTE]
> Tool results are text. `str(output)` works for the example, but in real code send JSON
> (`json.dumps(output)`): the model reads it more reliably than a Python repr, and it survives
> values like `None` and `True` intact.

## The assistant message comes first

Every tool result must answer a tool call the model made, and the model's tool calls live in its
assistant message. Leave that message out and the conversation reads: the user asks a question,
then a tool result arrives from nowhere. Both providers reject it with a 400: Anthropic says the
`tool_result` block has no matching `tool_use` in the previous message, and OpenAI that a `tool`
message must follow a message with `tool_calls`.

The order is always: the assistant message with **all** of that turn's tool calls, then one tool
result per call, then the next model call.

```quiz
question: A response holds two tool calls. Which history is right for the next request?
options:
  - "assistant (call A), tool (A), assistant (call B), tool (B)"
  - "assistant (calls A and B), tool (A), tool (B)"
  - "tool (A), tool (B), assistant (calls A and B)"
answer: 1
explain: The model made both calls in one message, so that message goes in once, as it was, followed by both results. Splitting it rewrites history, and it teaches Anthropic's models to stop making parallel calls.
```

## Cap the steps

A model can get stuck: it calls `find_slots` for Thursday, then Friday, then Thursday again,
looking for something that isn't there. Every step is a paid call, and each resends the whole
growing conversation. A `for` loop over `range(MAX_STEPS)` guarantees an end. When it runs out,
raise an exception the caller can handle, usually by handing the conversation to a person.

Pick the cap from the task: two or three tool calls for a booking, more for research. A cap
reached in normal use means it's too low, or a tool is giving the model results it can't use.

## Errors are results

Tools fail. The order doesn't exist, the calendar API times out, the model passes a date in the
past. If the exception escapes the loop, the whole conversation is lost, including the parts that
worked. Catch it and send it to the model **as the tool's result**:

```python
import json

class SlotTaken(Exception):
    pass

def book_appointment(practitioner, time):
    raise SlotTaken(f"{time} with Dr {practitioner} was booked a moment ago")

arguments = {"practitioner": "Patel", "time": "14:30"}
try:
    content = json.dumps(book_appointment(**arguments))
except Exception as error:
    content = json.dumps({"error": str(error)})

{"role": "tool", "tool_call_id": "call_02", "content": content}
```

The model reads "14:30 was booked a moment ago" and does what a receptionist would: offers 16:00
instead. The same goes for a tool name that isn't in the registry (models do invent them) and for
arguments the function can't take. Log the error too, because a tool that fails often is a bug in
your code, not the model's. Anthropic's API also lets a result carry `"is_error": true`; an adapter
can set it when the content is an error object.

> [!WARNING]
> Don't send a stack trace or an internal error message to the model. It ends up in the
> conversation, and possibly in front of the user. "Order 9999 not found" helps it recover;
> `psycopg.errors.UndefinedTable: relation "orders_v2"` helps nobody and leaks your schema.

## Several calls at once

Asked "Where are my orders 1042 and 1043?", a model will often request `get_order` twice in the
same response. These are **parallel tool calls**: run each one, then append all the results, in
order, each with its own `tool_call_id`, before calling the model again. The loop above already
does this, because it iterates over `response.tool_calls`. Your Anthropic adapter merges
consecutive tool messages into one user message of `tool_result` blocks, which is what that API
expects.

For tools that wait on the network, the calls in one turn are independent, so you can run them
concurrently (module 12's `asyncio.gather`, with an async registry), and the turn takes as long as
the slowest call instead of the sum.

## Validate the arguments

The arguments come from a model, which makes them untrusted input, like a webhook body. Before a
tool runs, check them with the Pydantic model you generated its schema from:

```python
from pydantic import BaseModel, ValidationError

class BookAppointment(BaseModel):
    practitioner: str
    start: str
    patient_email: str

try:
    BookAppointment.model_validate({"practitioner": "Patel", "start": "14:30"})
except ValidationError as error:
    content = {"error": f"Invalid arguments: {error.errors()[0]['loc'][0]}: {error.errors()[0]['msg']}"}
content
```

Invalid arguments become an error result, exactly like a failing tool, and the function never
runs. For a tool that only reads, that's tidiness. For one that writes, books, sends or refunds,
it's the difference between a model mistake and a real-world one.

## Where this leaves you

The loop calls the model with the tools, and when the response has tool calls, appends the
assistant message, runs every call, and appends one result per call, until the model answers or
the step cap runs out. Exceptions, unknown tools and invalid arguments become error results the
model can react to. The drills build the messages, fix the two classic loop bugs, and finish with a
loop that handles parallel calls with validated arguments.
