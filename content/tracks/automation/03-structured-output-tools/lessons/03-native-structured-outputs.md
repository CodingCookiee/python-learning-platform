---
slug: native-structured-outputs
title: Native structured outputs
summary: Both providers can hold the model to a JSON schema. Send one from a Pydantic model through an optional schema= feature of your client, and still validate what comes back.
minutes: 40
exercises:
  - struct-predict-model-schema
  - struct-strict-schema
  - struct-adapter-schema-mode
  - struct-extract-native
---

Everything in the last two lessons relied on the model choosing to follow your instructions, and on
your code cleaning up when it didn't. Both Anthropic and OpenAI can do better: give them a JSON
schema, and they constrain the model's output while it's being generated, so the reply is valid
JSON matching that schema. No fences, no preamble, no missing brackets. This lesson shows each
provider's version, adds it to your neutral client as an optional `schema=` argument, and explains
why you still validate the result.

## From a Pydantic model to a JSON schema

You don't write JSON schemas by hand. Your Pydantic model already describes the shape, and
`model_json_schema()` turns it into one:

```python
from typing import Literal
from pydantic import BaseModel, Field

class Ticket(BaseModel):
    """A customer support ticket, triaged."""
    category: Literal["billing", "shipping", "returns", "technical"]
    urgent: bool = Field(description="True if the customer can't use the product at all")
    order_id: str | None = None

Ticket.model_json_schema()
```

Three details matter for what follows:

- A `Literal` becomes an `enum`, which is how "one of these labels" reaches the model.
- The class docstring and each `Field(description=...)` become `description` entries. The model
  reads them, so they're prompt text in disguise: write them for the model.
- `order_id: str | None = None` becomes `anyOf: [string, null]` with a default, and it's **not** in
  `required`. Keep that in mind for the strict section below.

## Anthropic: output_config.format

On the Messages API, pass the schema in `output_config.format`. The reply's text block is then a
JSON string matching it:

```python norun
import os
import httpx

response = httpx.post(
    "https://api.anthropic.com/v1/messages",
    headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"},
    json={
        "model": "claude-opus-5",
        "max_tokens": 1024,
        "system": "Triage the support ticket.",
        "messages": [{"role": "user", "content": "<ticket>\nMy parcel never arrived. Order 1042.\n</ticket>"}],
        "output_config": {"format": {"type": "json_schema", "schema": schema}},
    },
    timeout=60,
)
body = response.json()
body["content"][0]["text"]   # '{"category":"shipping","urgent":false,"order_id":"1042"}'
```

Anthropic requires `"additionalProperties": false` on every object, and doesn't enforce every JSON
schema keyword: numeric bounds such as `minimum` and string lengths such as `maxLength` aren't
applied to the output (the official SDKs strip them and check them on the client instead). Before
this feature existed, the usual trick was to define a single tool whose `input_schema` was your
schema and force the model to call it with `"tool_choice": {"type": "tool", "name": "record_ticket"}`,
then read the tool call's `input`. You'll still see it in older code. Prefer `output_config`: some
of the newest models reject a forced `tool_choice` with a 400.

## OpenAI: response_format with json_schema

On Chat Completions, the schema goes in `response_format`, with a name and `"strict": true`:

```python norun
response = httpx.post(
    "https://api.openai.com/v1/chat/completions",
    headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
    json={
        "model": "gpt-5",
        "messages": [
            {"role": "system", "content": "Triage the support ticket."},
            {"role": "user", "content": "<ticket>\nMy parcel never arrived. Order 1042.\n</ticket>"},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "Ticket", "strict": True, "schema": schema},
        },
    },
    timeout=60,
)
message = response.json()["choices"][0]["message"]
message["content"]    # '{"category":"shipping","urgent":false,"order_id":"1042"}'
message["refusal"]    # None, or the model's explanation when it declines
```

Strict mode has rules of its own: every object needs `"additionalProperties": false`, and **every**
property must be listed in `required`. An optional field stays optional by allowing `null`, not by
leaving it out. When the model declines to answer, `content` is empty and `refusal` explains why;
Anthropic signals the same thing with `stop_reason: "refusal"`.

> [!JS]
> In the JS SDKs, `zodResponseFormat(Ticket, "ticket")` builds this `response_format` from a zod
> schema. `model_json_schema()` plus the strict fix-ups below is the Python equivalent, with no SDK
> required.

## Strict schemas

Both providers want `additionalProperties: false`, and OpenAI wants every property required. A
Pydantic schema has neither, so you adjust it before sending. For a flat model that's a few lines:

```python
from pydantic import BaseModel

class Ticket(BaseModel):
    category: str
    order_id: str | None = None

schema = Ticket.model_json_schema()
strict = {**schema, "additionalProperties": False, "required": list(schema["properties"])}
strict["required"], strict["properties"]["order_id"]
```

`order_id` is now required, but its schema still allows `null`, so the model sends
`"order_id": null` when there's no order number instead of leaving the key out. Your Pydantic model
accepts both. Real models nest (an invoice has line items, each an object), so the drill walks the
whole schema, including `$defs`, where Pydantic puts nested models.

```quiz
question: "After the strict fix-up, a field declared as notes: str | None = None is in required. What must the model send when there are no notes?"
options:
  - "Nothing: it leaves the key out"
  - "\"notes\": null"
  - "\"notes\": \"\""
answer: 1
explain: Strict mode makes every key required, and the field's anyOf still allows null. That's how "optional" is spelled in strict schemas, and it makes "the email didn't say" explicit rather than a missing key.
```

## schema= in your neutral client

Your drills never talk to a provider directly; they take an `llm`. So add structured output to the
neutral interface as one optional argument, and let each adapter translate it:

```python norun
class LLM(Protocol):
    def complete(self, messages: list[dict], *, system: str | None = None,
                 tools: list[dict] | None = None, model: str | None = None,
                 max_tokens: int = 1024, temperature: float | None = None,
                 schema: dict | None = None) -> LLMResponse: ...
```

When `schema` is given, the Anthropic adapter adds `output_config.format`, the OpenAI adapter adds
`response_format`, and both put the JSON string in `response.text` as usual. Callers don't change
at all, and the scripted fake in the drills records `schema` along with everything else, so a test
can check exactly which schema you sent. A provider or model without the feature should raise a
clear error rather than silently ignore the argument; the prompt-and-repair loop from the last
lesson is your fallback there.

```quiz
question: Why add schema= to the neutral complete() rather than calling each provider's feature directly from the extraction code?
options:
  - "Because the fake client can't record provider-specific fields"
  - "So extraction code stays provider-neutral: switching providers, or testing offline, changes nothing above the adapter"
  - "Because output_config and response_format accept different schemas"
answer: 1
explain: The whole point of the A2 client is that automations don't know which provider they're on. Each new provider feature goes in the same way, as a neutral argument that the adapters translate.
```

## Guaranteed shape, not guaranteed truth

Constrained decoding guarantees the reply *parses and matches the schema*. It doesn't guarantee:

- **the constraints the provider skipped:** a `total` of `-40` matches `{"type": "number"}` when
  `minimum` was dropped;
- **a complete reply:** at `max_tokens` the JSON is still cut off;
- **an answer at all:** a refusal comes back as a refusal, not as your schema;
- **correct values:** the model can still put the vendor's name in `customer`, or invent an
  invoice number that isn't on the page.

So the reply still goes through `Invoice.model_validate_json(response.text)`, with your full model
and its validators, and `stop_reason` still gets checked first. Native mode removes the parsing
failures, which are most of the repair loop's work. It doesn't remove the need for the contract.

```python raises
from pydantic import BaseModel, Field

class Invoice(BaseModel):
    invoice_number: str
    total: float = Field(gt=0)

# Schema-valid (total is a number), and still wrong
Invoice.model_validate_json('{"invoice_number": "INV-2291", "total": -40}')
```

## Where this leaves you

Generate the schema from your Pydantic model, make it strict (no extra properties, every property
required, optional meaning nullable), and send it through `schema=`, which your adapters turn into
`output_config.format` or `response_format`. Then check the stop reason and validate the reply with
the full model anyway. The drills cover the schema Pydantic produces, the strict transform, the
adapter translation, and a native extraction function.
