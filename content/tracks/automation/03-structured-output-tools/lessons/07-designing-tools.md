---
slug: designing-tools
title: Designing tools models use correctly
summary: Names, descriptions and arguments that leave nothing to guess, small tools with small results, writes that are safe to repeat, and dangerous actions that wait for a person.
minutes: 40
exercises:
  - tools-idempotency-key
  - tools-lint-definitions
  - tools-refactor-god-tool
  - tools-idempotent-booking
  - tools-confirm-dangerous
---

When a tool-using assistant misbehaves, the first instinct is to blame the model: it called the
wrong tool, passed a name where an id belonged, booked the same slot twice. Look closer and most of
those bugs are in the tools. The model is a capable new colleague reading your tool list for the
first time, with nothing to go on but what you wrote in it, and able to act on anything you gave it
access to. This lesson is about writing that list so the right call is the obvious one, and the
wrong one is either impossible or harmless.

## Names and descriptions

Here's the wrong way first. Both of these are real tools from real codebases:

```python
bad = {"name": "orders", "description": "Orders API",
       "parameters": {"type": "object", "properties": {"q": {"type": "string"}}}}

good = {
    "name": "get_order",
    "description": (
        "Look up one order by its order number. Use this when the customer gives an order number "
        "or you found one with find_orders_by_email. Returns status (pending, packing, shipped, "
        "delivered, cancelled), carrier, tracking_url and the order lines."
    ),
    "parameters": {"type": "object", "properties": {
        "order_id": {"type": "string", "description": "The four-digit order number, e.g. 1042"}},
        "required": ["order_id"]},
}
len(bad["description"]), len(good["description"])
```

From `orders` and `q`, the model has to guess whether to pass an order number, an email or a
sentence, and what comes back. The good version answers the three questions the model always has:

- **What does it do?** A verb and a noun in the name (`get_order`, `find_slots`,
  `create_refund_request`), and the same in the first sentence of the description.
- **When should I use it, and when not?** Name the situations, and point at the tool that provides
  its inputs ("an order number you found with `find_orders_by_email`").
- **What will I get back?** The fields and their possible values, so the model can plan its next
  step without calling the tool just to find out.

Every parameter gets a description too, with its format and an example. That text is the only
documentation the model will ever read.

## Arguments the model fills in correctly

Most wrong tool calls are wrong arguments. Shape them so there's one obvious way to fill them in:

| Instead of | Use | Because |
|------------|-----|---------|
| `status: str` | `status: Literal["open", "pending", "closed"]` | an enum can't be misspelt |
| `customer: str` (a name) | `customer_id: str` from an earlier result | names are ambiguous; ids aren't |
| `amount: float` | `amount_cents: int`, or a `Decimal` with a currency | units in the name, no float money |
| `date: str` | `day: str` described as "ISO date, e.g. 2026-10-01" | the format is stated, and checkable |
| `options: str` (JSON inside a string) | real, typed parameters | the model escapes nested JSON badly |
| ten optional flags | two or three required arguments | fewer choices, fewer wrong ones |

The Pydantic model from lesson 5 expresses all of it, and validates it when the call arrives:

```python
from typing import Literal
from pydantic import BaseModel, Field

class CreateRefundRequest(BaseModel):
    """Ask a team member to refund part or all of an order. Doesn't refund anything by itself."""
    order_id: str = Field(pattern=r"^\d{4}$", description="The four-digit order number, e.g. 1042")
    amount_cents: int = Field(gt=0, description="Amount to refund, in cents: 1250 means 12.50")
    reason: Literal["damaged", "late", "wrong_item", "changed_mind"]

CreateRefundRequest.model_json_schema()["properties"]["reason"]
```

## Small, focused tools with small results

The opposite of a good tool is the "god tool": `crm(action, payload)`, where `action` picks one of
twelve operations and `payload` is a JSON string whose shape depends on it. It's one tool
definition, so it looks tidy, but the model has to learn twelve hidden schemas from one vague
description, and your code can't validate anything until it has decoded the payload by hand.
Split it into `find_contact`, `add_note`, `set_deal_stage` and so on, each with its own schema.

Don't overcorrect: forty tools confuse a model just as much. Give each assistant the handful its
job needs. A booking assistant doesn't need `delete_patient`.

The same care applies to what a tool returns. Returning the whole order row, with 60 fields and
internal ids, costs tokens on every later call and buries the three fields that matter:

```python
order_row = {"id": 88123, "order_number": "1042", "status": "shipped", "carrier": "DPD",
             "tracking_url": "https://track.example/DPD123", "warehouse_bin": "B-17-04",
             "internal_margin": 0.42, "customer_ltv": 1890, "created_by_service": "shopify-sync"}

def order_for_model(row):
    return {key: row[key] for key in ("order_number", "status", "carrier", "tracking_url")}

order_for_model(order_row)
```

That also keeps internal data (the margin, the customer's lifetime value) out of a conversation the
customer can read.

```quiz
question: A model keeps passing the customer's name to get_customer(customer_id). What's the best fix?
options:
  - "Add 'NEVER pass a name!' to the system prompt"
  - "Describe customer_id as an id from find_customer, and give the model a find_customer(email) tool"
  - "Make get_customer accept either a name or an id"
answer: 1
explain: The model passes a name because it has no way to get an id. Give it the tool that produces one, and say in the description where the id comes from. Accepting names instead makes the tool ambiguous whenever two customers share one.
```

## Tools that are safe to call twice

The same tool call can run twice more easily than you'd think: the model repeats a call it isn't
sure worked, your loop retries after a timeout (A2's retry logic, doing its job), or a worker
restarts halfway through a conversation. For `get_order` that's harmless. For `book_appointment`
it's a double booking, and for `send_email` a customer who gets the same message twice.

So every tool that changes something should be **idempotent**: calling it twice with the same
arguments has the same effect as calling it once. Two techniques cover most cases:

- **Check before you create.** Before booking, look for a booking with the same practitioner, slot
  and patient. If it exists, return it instead of creating another.
- **Idempotency keys.** Derive a key from the tool name and arguments (or use one the API gives
  you), and record what each key produced. Stripe, most payment APIs and many CRMs accept an
  `Idempotency-Key` header for exactly this.

```python
bookings = {}

def book_appointment(practitioner, start, patient_email):
    key = (practitioner, start, patient_email)
    if key in bookings:
        return {**bookings[key], "status": "already_booked"}
    bookings[key] = {"booking_id": f"BK-{5520 + len(bookings) + 1}", "start": start}
    return {**bookings[key], "status": "booked"}

book_appointment("Patel", "2026-10-01T14:30", "ada@example.com"), book_appointment("Patel", "2026-10-01T14:30", "ada@example.com")
```

The second call reports `already_booked`, which tells the model its first attempt worked, so it
can move on instead of trying a third time.

## Dangerous actions wait for a person

Some actions shouldn't happen just because a model decided they should: refunds, payments,
cancelling a subscription, deleting data, emailing a customer on the business's behalf. The
model might have misunderstood, or it might have been talked into it by a message engineered to do
exactly that (A7 covers prompt injection in depth). For these, the tool doesn't act. It asks.

- **Approval.** The loop asks a person before running the tool (a Slack message with Approve and
  Decline buttons, built on A1's webhooks), and returns "declined" to the model if they say no.
- **Requests instead of actions.** `create_refund_request` puts a refund in a queue for the finance
  team; nothing moves until someone clicks. The model's job ends at a well-formed request.
- **Limits in code.** A refund tool that refuses anything over 50.00, whatever the model says.
- **Least privilege.** The support assistant's API key can read orders and create refund
  requests, and nothing else. What the model can't reach, it can't misuse.

```python
def require_approval(tool, approve):
    def guarded(**arguments):
        if not approve(tool.__name__, arguments):
            return {"error": f"A person declined {tool.__name__}. Tell the customer the team will follow up."}
        return tool(**arguments)
    return guarded

def issue_refund(order_id, amount):
    return {"refunded": amount, "order_id": order_id}

cautious = require_approval(issue_refund, approve=lambda name, arguments: arguments["amount"] <= 20)
cautious(order_id="1042", amount=12.5), cautious(order_id="1042", amount=480)
```

The declined result is written for the model: it says what happened and what to tell the customer,
so the conversation ends gracefully instead of in a retry loop.

```quiz
question: Which of these tools should need a person's approval before it runs?
options:
  - "find_slots(practitioner, day)"
  - "send_invoice_reminder(invoice_id), which emails the client's customer"
  - "get_order(order_id)"
answer: 1
explain: It acts on the business's behalf, in front of its customers, and can't be taken back. Read-only tools like find_slots and get_order are safe to run automatically; the question to ask is "what's the worst this call can do if the model is wrong?".
```

## Where this leaves you

Name tools verb_noun, and describe what each does, when to use it and what it returns. Make
arguments hard to get wrong: enums, ids, units and formats. Keep tools focused and their results
small. Make every write safe to repeat, and put anything costly or irreversible behind a person,
a request queue or a hard limit. The drills build an idempotency key, a tool linter, a refactor of
a god tool, an idempotent booking tool and an approval guard.
