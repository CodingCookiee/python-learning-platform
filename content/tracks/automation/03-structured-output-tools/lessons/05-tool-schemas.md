---
slug: tool-schemas
title: Tools and their schemas
summary: A tool is a name, a description and a JSON schema for its arguments. Write them from Python functions or Pydantic models instead of by hand, and translate them for each provider.
minutes: 35
exercises:
  - tools-predict-signature
  - tools-provider-shapes
  - tools-schema-from-function
  - tools-schema-from-model
---

A physiotherapy clinic wants its website chat to book appointments. A patient types "Can I see
Dr Patel on Thursday afternoon?", and the answer depends on a calendar the model has never seen.
Structured output got data *out* of the model. Tool calling runs the other way: the model asks
your code to do something, such as look up free slots, and uses the result to answer. This lesson
covers what a tool is and how to describe one; the next one runs them.

## What tool calling is

The model never runs anything. It can only ask. One round trip looks like this:

1. You call the model with the conversation **and a list of tools**: each has a name, a
   description, and a JSON schema for its arguments.
2. Instead of answering, the model replies with `stop_reason: "tool_use"` and one or more tool
   calls, each with an id, a tool name and arguments that match the schema.
3. Your code runs the function, with whatever checks you like, and sends the result back.
4. The model reads the result and either answers, or asks for another tool.

In the neutral format from A2, the tool you offer and the call you get back look like this:

```python
find_slots_tool = {
    "name": "find_slots",
    "description": "Find free appointment slots for a practitioner on a given day.",
    "parameters": {
        "type": "object",
        "properties": {
            "practitioner": {"type": "string", "description": "Surname, e.g. Patel"},
            "day": {"type": "string", "description": "ISO date, e.g. 2026-10-01"},
        },
        "required": ["practitioner", "day"],
    },
}

# What your client returns when the model wants to use it (an LLMResponse, shown as a dict)
response = {
    "text": "",
    "stop_reason": "tool_use",
    "tool_calls": [{"id": "call_01", "name": "find_slots",
                    "arguments": {"practitioner": "Patel", "day": "2026-10-01"}}],
}
response["tool_calls"][0]["arguments"]["day"]
```

The `description` fields aren't documentation for you: they're the only thing the model knows
about your tool. Lesson 7 is about writing them well.

## Each provider's format

The adapters translate the neutral tool, just as they translate messages. Anthropic calls the
schema `input_schema`; OpenAI wraps the whole tool in a `function` object:

```python norun
# Anthropic: POST /v1/messages
{"model": "claude-opus-5", "max_tokens": 1024, "messages": [...],
 "tools": [{"name": "find_slots", "description": "Find free appointment slots...",
            "input_schema": {"type": "object", "properties": {...}, "required": [...]}}]}
# The reply's content has a block
#   {"type": "tool_use", "id": "toolu_01...", "name": "find_slots", "input": {"practitioner": "Patel", ...}}

# OpenAI: POST /v1/chat/completions
{"model": "gpt-5", "messages": [...],
 "tools": [{"type": "function",
            "function": {"name": "find_slots", "description": "Find free appointment slots...",
                         "parameters": {"type": "object", "properties": {...}, "required": [...]}}}]}
# The reply's message has
#   "tool_calls": [{"id": "call_...", "type": "function",
#                   "function": {"name": "find_slots", "arguments": "{\"practitioner\": \"Patel\", ...}"}}]
```

Note the last line: OpenAI sends the arguments as a **JSON string**, and Anthropic as an object.
Your A2 adapter already parses OpenAI's string, so `ToolCall.arguments` is always a dict. Both
providers also accept `"strict": true` on a tool (at the top level for Anthropic, inside
`function` for OpenAI), which constrains the arguments to the schema the way `schema=` constrains
a reply. The same strict rules apply: no extra properties, and for OpenAI every property required.

```quiz
question: Your OpenAI adapter forgets to json.loads the arguments. What does the tool function receive?
options:
  - "A dict, because httpx parses the response JSON"
  - "A string like '{\"practitioner\": \"Patel\"}', so `find_slots(**arguments)` fails"
  - "None"
answer: 1
explain: "response.json() parses the outer response, but OpenAI's arguments field is itself a string of JSON inside it. It needs its own json.loads, which is exactly the kind of provider difference the adapter exists to hide."
```

## Schemas from Python functions

Writing that schema by hand means describing `find_slots` twice: once in Python, once in JSON,
and the two drift apart. The function's signature already says which arguments exist, their
types and which have defaults. `inspect` and `typing` can read all of it:

```python
import inspect
from typing import get_type_hints

def find_slots(practitioner: str, day: str, duration_minutes: int = 30) -> list[str]:
    """Find free appointment slots for a practitioner on a given day."""
    return []

hints = get_type_hints(find_slots)
[(name, hints[name], p.default is inspect.Parameter.empty)
 for name, p in inspect.signature(find_slots).parameters.items()]
```

From there it's a mapping from Python types to JSON schema types:

| Python | JSON schema |
|--------|-------------|
| `str`, `int`, `float`, `bool` | `{"type": "string"}`, `"integer"`, `"number"`, `"boolean"` |
| `list[str]` | `{"type": "array", "items": {"type": "string"}}` |
| `Literal["in_person", "video"]` | `{"type": "string", "enum": ["in_person", "video"]}` |
| `str \| None` | `{"anyOf": [{"type": "string"}, {"type": "null"}]}` |
| a parameter with a default | left out of `required` |

`get_origin` and `get_args` from `typing` take a hint apart: `get_origin(list[str])` is `list` and
`get_args(list[str])` is `(str,)`. The docstring, from `inspect.getdoc`, becomes the tool's
description. This is essentially what SDK helpers like Anthropic's `@beta_tool` decorator do; after
the drill you'll know there's no magic in them.

> [!WARNING]
> Check `bool` before `int`, or map types with a dict keyed by the type itself. `bool` is a
> subclass of `int`, so an `issubclass(hint, int)` test turns every boolean flag into an integer.

## Schemas from Pydantic models

A function signature can't say much about each argument: there's nowhere to put "ISO date, e.g.
2026-10-01". A Pydantic model can, with `Field(description=...)`, and it can validate the
arguments when the call comes back:

```python
from typing import Literal
from pydantic import BaseModel, Field

class BookAppointment(BaseModel):
    """Book an appointment slot for a patient. Only use a start time returned by find_slots."""
    practitioner: str = Field(description="Surname, e.g. Patel")
    start: str = Field(description="ISO datetime of a free slot, e.g. 2026-10-01T14:30")
    patient_email: str
    kind: Literal["in_person", "video"] = "in_person"

schema = BookAppointment.model_json_schema()
schema["properties"]["start"], schema["required"]
```

The model's docstring is the tool description, its schema is the parameters, and in the next lesson
`BookAppointment.model_validate(call.arguments)` checks what the model sent before anything touches
the clinic's calendar. Use a model whenever arguments need descriptions or rules; use the function
signature for small tools where the names say it all.

> [!JS]
> In the JS SDKs this is `zodFunction` or `betaZodTool`: a zod schema that becomes the tool's
> parameters and validates the arguments. Same idea, same reason.

## Where this leaves you

A tool is a name, a description and a JSON schema for its arguments, and the model can only ask
you to run it. Keep one neutral definition and let the adapters produce Anthropic's `input_schema`
and OpenAI's `function` wrapper. Generate the schema from the function's signature with `inspect`
and type hints, or from a Pydantic model when the arguments need descriptions and validation. The
drills read a signature, translate tools for each provider, and build both generators.
