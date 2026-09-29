---
slug: agents-and-workflows
title: Agents, workflows and when to use which
summary: An agent lets the model choose the next step; a workflow keeps that choice in your code. Know the difference, what each costs, and why most paid jobs want the workflow.
minutes: 35
exercises:
  - agent-predict-resent-history
  - agent-projected-cost
  - agent-invoice-chaser-workflow
  - agent-refactor-to-workflow
---

A bookkeeping firm asks for "an AI agent that chases unpaid invoices". Picture two ways to build
it. In one, the model gets tools to look up invoices, read payment history and send email, and
decides for itself what to do. In the other, your code finds the overdue invoices, picks the tone
from the number of days overdue, and asks the model for one thing only: the wording of the email.
Both send reminders. The second costs a fraction as much, does the same thing every time, and can
be tested line by line. This lesson is about telling those two apart, and knowing when the first is
worth what it costs.

## Three shapes of AI automation

Everything you've built so far fits one of three shapes, and the difference is **who decides the
next step**:

| Shape | Who decides the steps | Example |
|-------|-----------------------|---------|
| A single call | nobody: there's one step | classify a ticket, summarise a call |
| A workflow | your code, fixed in advance | find overdue invoices, pick a tone, draft, send |
| An agent | the model, one step at a time, in a loop | research a prospect until you know enough |

An **agent** is a loop: the model looks at the goal and everything so far, chooses an action (a
tool call), sees the result, and chooses again, until it decides it's done. A3's dispatch loop was
already a small agent. A **workflow** can call the model many times, even with tools, but the
sequence is written in your code.

Here's the invoice chaser as a workflow. The model is called once, for the only part that needs
language:

```python
from plp_fakes import ScriptedLLM

invoice = {"number": "INV-2291", "client": "Harbour Dental", "amount": "1,450.00", "days_overdue": 18}

def chase(llm, invoice):
    if invoice["days_overdue"] < 7:
        return None                                    # code decides: too early to chase
    tone = "firm" if invoice["days_overdue"] >= 14 else "friendly"
    prompt = (f"Write a {tone}, three-sentence payment reminder for invoice {invoice['number']} "
              f"({invoice['amount']}, {invoice['days_overdue']} days overdue) to {invoice['client']}.")
    return llm.complete([{"role": "user", "content": prompt}], max_tokens=200).text

llm = ScriptedLLM(["Hi Harbour Dental team, invoice INV-2291 for 1,450.00 is now 18 days overdue. ..."])
chase(llm, invoice), len(llm.calls)
```

Every decision (whether to chase, how firmly) is a line of Python you can read, test and change
when the client changes their mind. The model can't decide to email a client twice, or at 3am, or
at all when the invoice isn't overdue.

## The same job as an agent

Now give the model the decisions. It gets three tools and a goal, and the loop runs until it stops
asking for tools. The scripted replies are what a real model might plausibly do:

```python
from plp_fakes import ScriptedLLM, tool_call

REGISTRY = {
    "get_invoice": lambda number: {"number": number, "amount": "1,450.00", "days_overdue": 18},
    "get_payment_history": lambda client: {"late_payments_last_year": 2},
    "send_email": lambda to, body: {"sent": True},
}

def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}

def run_agent(llm, goal, max_steps=6):
    messages = [{"role": "user", "content": goal}]
    for _ in range(max_steps):
        response = llm.complete(messages, tools=["...three tool definitions..."])
        if not response.tool_calls:
            return response.text
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            output = REGISTRY[call.name](**call.arguments)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": str(output)})

llm = ScriptedLLM([
    tool_call("get_invoice", number="INV-2291"),
    tool_call("get_payment_history", client="Harbour Dental"),
    tool_call("send_email", to="accounts@harbour.example", body="Hi, invoice INV-2291 is 18 days overdue..."),
    "I've sent Harbour Dental a firm reminder about INV-2291.",
])
run_agent(llm, "Chase invoice INV-2291 if it needs chasing.")
[call["messages"][-1]["role"] for call in llm.calls], sum(len(c["messages"]) for c in llm.calls)
```

Four model calls instead of one, and each resends the conversation so far. It also decided on its
own to send the email. That's fine when the script says so; with a real model you've no guarantee
it looked at the payment history before choosing a tone, or that it won't email twice after a
timeout.

## When a workflow is better

Use a workflow when **you can write the steps down in advance**. That covers most of what clients
pay for: intake forms, invoice chasing, lead enrichment, ticket triage, report generation. The
steps don't change from one run to the next, only the data does.

| | Workflow | Agent |
|---|---|---|
| Predictability | same steps every run | depends on what the model decides |
| Cost and latency | known, usually few calls | grows with every step, and each step resends history |
| Testing | each step is a function with a test | test outcomes, traces and limits |
| Auditing | "it did step 3 because of rule X" | "the model chose to" |
| Handles surprises | only the ones you wrote code for | can try something you didn't foresee |

An agent earns its cost when **the next step depends on what the last one found**, and you can't
list the possibilities: researching a company from scratch, working out why an alert fired,
answering a support conversation that could go anywhere. Even then, give it a narrow set of tools
and a hard limit.

```quiz
question: A client wants each new Typeform lead looked up in their CRM, scored with a fixed rubric, and posted to Slack if the score is above 70. What should you build?
options:
  - "An agent with CRM, scoring and Slack tools, told to handle each lead"
  - "A workflow: look up, score with one model call against the rubric, then an if statement for Slack"
  - "An agent, but with a step cap of three"
answer: 1
explain: The steps are the same for every lead, so write them down. The model's only job is applying the rubric, which is one structured-output call. The threshold is a rule, and rules belong in code where the client can see and change them.
```

## What an agent run costs

A2 taught you that you pay for every input token on every call. In an agent that adds up fast,
because each step sends the whole history again: the system prompt, the tool definitions, the task,
and every tool call and result so far.

```python
SYSTEM_AND_TOOLS = 1_200    # tokens sent on every call
TASK = 80
PER_STEP = 600              # one tool call plus its result, added to the history each step

history, total = SYSTEM_AND_TOOLS + TASK, 0
for step in range(1, 11):
    total += history
    history += PER_STEP
f"10 steps send {total:,} input tokens; the last call alone sends {history - PER_STEP:,}"
```

Ten steps send 39,800 input tokens, because the cost of a run grows with the **square** of its
steps: double the step cap and you roughly quadruple the worst-case bill. That's why every agent in
this module has a step cap, why lesson 3 keeps tool results small, and why lesson 5 trims history.
Estimate the worst case before you quote a client a price per run.

> [!TIP]
> Many providers discount repeated prompt prefixes (prompt caching, covered in A7), which softens
> this curve. It doesn't remove it: the history still has to fit in the context window, and cached
> tokens still cost something.

## Autonomy is a dial

It isn't all or nothing. Most good systems sit in between:

- **A workflow with one agentic step.** The invoice pipeline is fixed, but "find the right billing
  contact" is a small agent with two read-only tools and a cap of four steps.
- **An agent with narrow tools.** An on-call helper that can read metrics and logs, and can only
  *suggest* a restart for a person to approve (lesson 7).
- **An agent that hands back a plan.** It researches and proposes; your code or a person executes.

Before you build an agent, answer three questions in writing: what the steps are if you *can*
list them, what the worst thing it could do is, and what a run may cost at most. If the first
answer is a short list, you've just written the workflow.

## Where this leaves you

A workflow keeps the decisions in your code, and the model fills in the parts that need language.
An agent lets the model choose each step, which handles surprises and costs more with every step,
because each one resends the history. Reach for the workflow first. The drills predict how history
grows, price an agent run, build the invoice chaser as a workflow, and refactor an agent that
should never have been one.
