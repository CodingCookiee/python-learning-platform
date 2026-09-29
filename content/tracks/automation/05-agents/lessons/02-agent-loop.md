---
slug: agent-loop
title: The agent loop from scratch
summary: "About eighty lines: the model decides, tools act, observations go back into the history, and the loop ends on a finish call, a plain reply or the step cap, with a trace of everything it did."
minutes: 50
exercises:
  - agent-find-finish
  - agent-predict-agent-trace
  - agent-loop
  - agent-fix-no-step-cap
  - agent-structured-finish
---

At 02:14 an alert fires: checkout-api is returning errors on 7% of requests. An on-call helper
agent can do the first ten minutes of what the engineer would do half asleep: check the error
rate, look for a recent deploy, read the error logs, and write up what it found before anyone has
opened a laptop. Nobody can list those steps in advance, because each one depends on what the last
one showed. That's a job for an agent, and this lesson writes the whole thing: no framework, about
eighty lines you can read in one sitting.

## The loop, in eighty lines

Every agent is the same loop. Send the goal and the history; if the model asks for tools, run them
and append what they returned (the **observations**); repeat until the model says it's finished or
you run out of steps.

```python
import json
import logging
from dataclasses import dataclass, field

from plp_fakes import ScriptedLLM, tool_call

logger = logging.getLogger("oncall")

FINISH = {
    "name": "finish",
    "description": ("Call this once, when you're done. The answer must stand on its own: "
                    "the engineer reads nothing else."),
    "parameters": {"type": "object", "required": ["answer"],
                   "properties": {"answer": {"type": "string", "description": "What you found, and what to do"}}},
}


@dataclass
class Step:
    number: int          # which model call asked for it
    tool: str
    arguments: dict
    ok: bool


@dataclass
class AgentResult:
    answer: str | None
    stop_reason: str     # "finished" | "no_finish" | "step_limit"
    steps: int           # model calls made
    trace: list[Step] = field(default_factory=list)


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def run_tool(call, registry):
    """Run one call. Every failure becomes an observation, never an exception."""
    if call.name not in registry:
        return json.dumps({"error": f"Unknown tool {call.name}. Use one of: {', '.join(registry)}"}), False
    try:
        return json.dumps(registry[call.name](**call.arguments), default=str), True
    except Exception as error:
        logger.warning("Tool %s failed: %s", call.name, error)
        return json.dumps({"error": f"{call.name} failed: {error}"}), False


def run_agent(llm, task, tools, registry, *, system=None, max_steps=8):
    messages = [{"role": "user", "content": task}]
    trace = []
    for step in range(1, max_steps + 1):
        response = llm.complete(messages, system=system, tools=[*tools, FINISH])
        finish = next((c for c in response.tool_calls if c.name == "finish"), None)
        if finish is not None:
            return AgentResult(finish.arguments.get("answer"), "finished", step, trace)
        if not response.tool_calls:
            return AgentResult(response.text, "no_finish", step, trace)
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            content, ok = run_tool(call, registry)
            trace.append(Step(step, call.name, call.arguments, ok))
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
    logger.warning("Step cap of %d reached", max_steps)
    return AgentResult(None, "step_limit", max_steps, trace)


REGISTRY = {
    "get_error_rate": lambda service, minutes=15: {"service": service, "error_rate": 0.071, "since": "02:10"},
    "get_recent_deploys": lambda service: [{"id": "d-4417", "at": "02:06", "author": "sam"}],
    "get_logs": lambda service, level="error", limit=20: ["02:10:41 PaymentClient: missing STRIPE_API_VERSION"],
}
llm = ScriptedLLM([
    tool_call("get_error_rate", service="checkout-api"),
    tool_call("get_recent_deploys", service="checkout-api"),
    tool_call("get_logs", service="checkout-api"),
    tool_call("finish", answer="Errors began 4 minutes after deploy d-4417, which dropped STRIPE_API_VERSION. Roll it back."),
])
result = run_agent(llm, "Alert: checkout-api 5xx rate is 7%. Find the likely cause.", ["...three tools..."], REGISTRY)
result.stop_reason, result.steps, [s.tool for s in result.trace], result.answer
```

Four model calls, three tools, one answer, and a trace of exactly what was done. Everything later
in this module (memory, planning, budgets, approvals) is a change to one of these lines.

## How it differs from A3's tool loop

A3's `run_tools` and this loop share their inner workings: the assistant message goes in before
its results, one result per call, errors become results. What changes is what the loop is *for*:

| | A3 `run_tools` | `run_agent` |
|---|---|---|
| Input | a question in a conversation | a goal to work towards |
| Ends when | the model replies without tools | the model calls `finish` |
| Step cap | an exception: something went wrong | a normal outcome with a stop reason |
| Returns | the reply text | an `AgentResult`: answer, stop reason, steps, trace |
| Typical steps | one or two lookups | as many as the goal needs, up to the cap |

The tool loop answered one question with a lookup or two, so running out of steps really was an
error. An agent working a goal will sometimes run out of steps, and "I got this far" is useful:
the engineer still wants the trace.

## Stop conditions

This loop stops for three reasons, and the caller can act on each one:

- **`finished`**: the model called `finish`. The answer is in its arguments.
- **`no_finish`**: the model replied in plain text without calling `finish`. Often that *is* an
  answer, sometimes it's a question back to the user, and sometimes it's "Let me check the logs"
  with no tool call attached. Your code can't tell which, so it's reported separately.
- **`step_limit`**: the cap ran out. Hand the trace to a person.

Why a `finish` tool, when A3's loop just waited for text? Because text is ambiguous. Models narrate
("I'll look at the deploys next") and a loop that stops on the first text reply stops too early.
A `finish` call is an explicit decision, and it has a schema.

Lesson 7 adds more reasons (a budget, a deadline, a detected loop), each one more `return` in the
same loop.

```quiz
question: In one response the model calls get_logs and finish together. What should the loop do?
options:
  - "Run get_logs, then stop with the finish answer"
  - "Stop with the finish answer, and don't run get_logs"
  - "Run get_logs, send its result back, and ignore finish"
answer: 1
explain: finish means the model is done, so nothing it asked for alongside can change the answer, and running it would only cost time (or, for a tool that writes, do something nobody will look at). Stop there, and record the ignored call in the trace if you want to see it happen.
```

## The final answer format

The `finish` tool's schema is your **output contract**. The on-call engineer wants more than a
paragraph: the likely cause from a fixed list, a suggested action, and the evidence. Put those in
the schema and they arrive as arguments, just like A3's structured outputs:

```python
finish_schema = {
    "type": "object",
    "required": ["summary", "likely_cause", "suggested_action", "evidence"],
    "properties": {
        "summary": {"type": "string"},
        "likely_cause": {"type": "string", "enum": ["deploy", "dependency", "capacity", "unknown"]},
        "suggested_action": {"type": "string"},
        "evidence": {"type": "array", "items": {"type": "string"}, "minItems": 1,
                     "description": "Facts from tool results that support the cause, e.g. deploy ids"},
    },
}
sorted(finish_schema["properties"]), finish_schema["properties"]["likely_cause"]["enum"]
```

Treat those arguments as untrusted, like every tool call: validate them with a Pydantic model, and
when they're invalid send the errors back as the `finish` call's result, so the model can try
again. The stretch drill does exactly that, and nudges a model that answers in plain text to call
`finish` properly.

## Read the trace

The trace is the most useful thing the agent returns. It's how you debug a bad answer ("it never
looked at the logs"), how you explain the result to a client, and how you find tools the model
struggles with.

```python
from dataclasses import dataclass

@dataclass
class Step:
    number: int
    tool: str
    arguments: dict
    ok: bool

trace = [
    Step(1, "get_error_rate", {"service": "checkout-api"}, True),
    Step(2, "get_logs", {"service": "checkout-api", "level": "fatal"}, False),
    Step(3, "get_logs", {"service": "checkout-api", "level": "error"}, True),
]
for s in trace:
    print(f"{s.number}. {s.tool}({', '.join(f'{k}={v!r}' for k, v in s.arguments.items())}) {'ok' if s.ok else 'FAILED'}")
```

Step 2 failed and the model recovered by changing an argument: exactly what the error observation
was for. A tool that fails in most traces is a tool to fix (lesson 3). Production agents write each
step to a log as it happens, not only at the end, so a crash halfway through still leaves a record.

> [!NOTE]
> Parallel calls share a step number: `steps` counts model calls, which is what you pay for, and
> one call can ask for several tools.

## Where this leaves you

The agent loop calls the model with the tools plus `finish`, runs every tool call it asks for,
appends each observation linked to its call, and repeats. It stops on `finish`, on a plain reply
or at the step cap, and always returns what it did. The drills find the `finish` call, predict a
trace, write the loop, fix an agent with no step cap, and hold the final answer to a schema.
