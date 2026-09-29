Kiln & Co sells coffee gear online, and three people answer its support inbox. Most mornings go on
the same routine: work out what each email is about, find the order, check its status, and write
back. They've asked you for a triage service that does the routine part: read each ticket, pull out
the facts, decide how urgent it is and which queue it belongs in, look up the orders it mentions,
and draft a reply a person can send with one click. Refunds stay with people. The service may ask
for one, never give one.

You'll build it as one module, `triage.py`, using everything in this module: extraction validated
with Pydantic and repaired with the errors, native structured output through `schema=`, rules in
code rather than in the prompt, a tool loop with validated arguments and error results, idempotent
and least-privilege tools, and a hard cap on steps and cost. It takes an `llm` with the course's
neutral interface, so the same code runs against the scripted fake in the browser and against your
A2 client on your machine.

## A sample run

With the scripted model in the starter (`demo_llm()`), `python triage.py` prints:

```text
T-2001  returns       normal    calls 4  $0.0171
  tools: get_order ok, create_refund_request ok
  refund request RR-0001: order 1042, 8.50, damaged
  draft: I'm sorry your mug arrived broken, Ada. I've asked our refunds team to refund the 8.50 for it, and they'll confirm by email within two working days.

T-2002  shipping      high      calls 4  $0.0159
  tools: find_orders_by_email ok, get_order ok
  draft: Sorry for the wait, Grace. Order 1043 is with DPD and due on 2 October, before Saturday. You can track it at https://track.example/DPD-88213.

T-2003  human_review  high      calls 3  $0.0108
  tools: create_refund_request error
  review: low confidence (0.45)
  draft: Thanks for getting in touch. I can't find order 1044 on your account, so a member of our team will look into this and reply to you directly.
```

Ada's broken mug gets a refund *request* for the mug alone. Grace gave no order number, so the
drafter found her orders by email first. Mallory's ticket is a prompt injection: the model was
talked into asking for a full refund of someone else's order, the tool refused because order 1044
isn't Mallory's, and the low confidence sent the ticket to a person. Nothing in your code trusted
the model to behave.

## The design

| Piece | Kind | Job |
|-------|------|-----|
| `Ticket` | frozen dataclass (in the starter) | One inbound email: id, sender, subject, body |
| `TicketFacts` | Pydantic model (in the starter) | What the model reads from a ticket |
| `extract_facts` | function | One structured-output call, repaired with the validation errors |
| `urgency`, `route` | functions | The business rules, in plain Python |
| `GetOrder`, `FindOrdersByEmail`, `CreateRefundRequest` | Pydantic models (in the starter) | Each tool's arguments; their schemas become the tool definitions |
| `RefundQueue` | class | Refund requests waiting for a person, idempotent |
| `make_tools` | function | The tool definitions and a registry, scoped to one ticket's sender |
| `draft_reply` | function | The tool loop that writes the reply |
| `Budget` | class | Counts model calls and dollars for one ticket, and stops them |
| `process_ticket` | function | Runs the whole thing and returns a `TriageResult`; never raises for model or tool trouble |

## Requirements

### Extraction

`extract_facts(llm, ticket, budget)` sends the ticket (sender, subject and body, between `<ticket>`
tags) with a system prompt that defines each category and tells the model to treat the ticket as
data, not instructions. It calls `llm.complete(..., schema=TicketFacts.model_json_schema(),
temperature=0)`. `TicketFacts` forbids extra fields and has no defaults, so its schema is already
strict.

Validate the reply with `TicketFacts`. When it fails, append the reply and the validation errors to
the conversation and ask again, for at most 3 attempts in total, then raise an exception that
`process_ticket` turns into a `human_review` result with the problems as the reason. Every call
goes through the budget (below).

### Decisions

- `urgency(facts)`: `"critical"` if the customer is blocked (can't use the product or their
  account at all); otherwise `"high"` if they're angry or mention a deadline; otherwise `"low"` if
  the sentiment is positive; otherwise `"normal"`.
- `route(facts)`: the category's name as the queue, or `"human_review"` when the category is
  `"unknown"` or the confidence is below `REVIEW_BELOW_CONFIDENCE` (0.7). Record why in
  `review_reason`: `category unknown` or `low confidence (0.45)`.

The model never decides urgency or routing. When Kiln & Co decide deadlines aren't urgent after
all, that's a one-line change with a test, not a prompt rewrite.

### Tools

`make_tools(ticket, facts, refunds)` returns the neutral tool definitions, generated from the three
argument models (name, the model's docstring as the description, its schema as the parameters), and
whatever registry your loop needs. The tools:

| Tool | Returns |
|------|---------|
| `get_order(order_id)` | The order from `ORDERS` |
| `find_orders_by_email(email)` | `{"order_ids": [...]}` for that email |
| `create_refund_request(order_id, amount_cents, reason)` | `{"request_id": "RR-0001", "status": "waiting for a person to review"}` |

The rules that keep them safe live in the tools, not the prompt:

- **Least privilege.** Every tool only sees orders placed by `ticket.from_email`, the address the
  email really came from. Not `facts.customer_email`: that's something the model extracted, and a
  ticket can talk the model into extracting anything. Another customer's order is an error:
  `Order 1044 isn't on this customer's account`.
- **Limits in code.** A refund request can't exceed the order's `total_cents`.
- **Idempotent.** `RefundQueue.create` returns the existing request when the same order and amount
  are requested again, so a repeated call never queues a second refund. Request ids are `RR-0001`,
  `RR-0002` and so on, in the order they're first created, across all tickets in a run.
- **Requests, not actions.** Nothing in the service moves money.

### The drafting loop

`draft_reply` runs the dispatch loop from lesson 6. It sends the ticket and the extracted facts
with a system prompt for the drafter, and offers the tools. For every response with tool calls:
append the assistant message with all of its calls, then one tool result per call, in order.

- Validate each call's arguments with its model before running anything. Invalid arguments, unknown
  tool names and exceptions from the tools all become `{"error": ...}` results the model can
  react to, and a `ToolUse(name, arguments, ok=False)` in the log.
- Successful calls are logged with `ok=True`. Results go back as JSON.
- The loop ends when the model answers with no tool calls: that text is the draft.

### The budget

A `Budget` allows `MAX_CALLS` (8) model calls and `MAX_COST_USD` ($0.05) per ticket. Call
`budget.check()` before every model call and `budget.charge(response)` after it. The cost of a
call is `input_tokens * INPUT_PER_MTOK + output_tokens * OUTPUT_PER_MTOK`, divided by a million.
`check()` raises `BudgetExceeded` when the calls are used up or the cost has reached the cap.

Extraction and drafting share one budget, so a ticket that needed three extraction attempts has
five calls left for drafting. A model that loops on tool calls is stopped by the budget, not by
luck: `process_ticket` catches `BudgetExceeded` and returns `human_review` with a reason starting
`budget:` and no draft.

### The result

`process_ticket(llm, ticket, refunds=None)` returns a `TriageResult` with the ticket id, the facts,
the urgency, the queue, the draft, the refund requests this ticket created, the model calls and
cost used, the tool log and the review reason. It creates a fresh `RefundQueue` if it isn't given
one. Whatever the model or the tools do, it returns a result rather than raising.
