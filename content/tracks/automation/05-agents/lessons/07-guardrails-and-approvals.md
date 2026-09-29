---
slug: guardrails-and-approvals
title: Guardrails, approvals and frameworks
summary: Limits enforced in code (allow-lists, step caps, cost budgets checked before each call, deadlines, loop detection), people in front of risky actions with pause and resume from JSON, and when a framework is worth it.
minutes: 55
exercises:
  - agent-allow-list
  - agent-fix-budget-after-call
  - agent-detect-loops
  - agent-fix-approval-bypass
  - agent-guarded-run
  - agent-pause-resume
---

A client will ask two questions before they let your agent near their business: *what's the most
it can cost?* and *what's the worst it can do?* "The prompt tells it to be careful" answers
neither. The answers have to be code: limits the loop enforces whatever the model says, and a
person in front of anything that can't be undone. This lesson builds both, then looks at the
frameworks that package them, and when you're better off without one.

## Allow-lists: it can only misuse what it can reach

The first guardrail is the tool list. An agent can't delete a customer if no tool deletes
customers. Give each deployment exactly the tools its job needs, and treat any call to a tool
outside that list as an error, not a request:

```python
ALL_TOOLS = ["get_invoice", "list_overdue", "send_reminder", "issue_refund", "delete_customer"]
ROLES = {"invoice_chaser": {"get_invoice", "list_overdue", "send_reminder"},
         "read_only_reporter": {"get_invoice", "list_overdue"}}

def tools_for(role):
    allowed = ROLES[role]
    return [name for name in ALL_TOOLS if name in allowed]

tools_for("read_only_reporter")
```

Filter the definitions you **offer** and the registry you **run** from, both. A model that
invents `issue_refund` then gets "Unknown tool", because as far as this deployment is concerned
it doesn't exist. Scope the credentials the same way: the invoice chaser's API key shouldn't be
able to refund anything even if your code had a bug.

## Step caps, budgets and deadlines

Three limits bound every run, and all three are checked **before** each model call:

- **Steps.** Lesson 2's cap. It bounds everything else loosely, since every step costs money
  and time.
- **Cost.** A dollar budget per run, from A2's pricing. Before each call, work out its **worst
  case**: the estimated input tokens (history, system prompt, tools) plus `max_tokens` of output.
  If spent plus worst case would pass the budget, stop. After the call, charge the **actual**
  cost from `response.usage`.
- **Time.** A wall-clock deadline for the run. Read the time from an injected `clock`, so tests
  can move time forward without waiting.

The wrong way first, because it's the common one:

```python
from decimal import Decimal

limit, spent = Decimal("0.02"), Decimal("0")
for cost in [Decimal("0.006"), Decimal("0.006"), Decimal("0.006"), Decimal("0.006")]:
    spent += cost                  # the call has already happened, and been paid for
    if spent > limit:
        break
spent, spent > limit
```

Checking after the call means the check can only tell you you've *already* overspent. With a
budget of $0.02 this run spent $0.024. The fix drill moves the check in front of the call.

A deadline works the same way:

```python
class FakeClock:
    def __init__(self):
        self.now = 1_000.0
    def __call__(self):
        return self.now

clock = FakeClock()
started, deadline = clock(), 60
steps = 0
while clock() - started < deadline:
    steps += 1
    clock.now += 25                # each step takes 25 seconds in this pretend run
steps
```

Production code passes `time.monotonic`; tests pass a fake. Tools need their own timeouts too
(A1's `httpx` timeouts): a deadline checked between steps can't interrupt a tool that hangs.

## Loops and repetition

A model that gets a result it can't use often asks again, with the same arguments. The step cap
stops that eventually, after paying for every repeat. A **loop detector** stops it at the third
identical call. "Identical" means the same tool and the same arguments, compared in a canonical
form, since `{"a": 1, "b": 2}` and `{"b": 2, "a": 1}` are the same call:

```python
import json
from collections import Counter

seen = Counter()
calls = [("get_error_rate", {"service": "checkout-api", "minutes": 15}),
         ("get_logs", {"service": "checkout-api"}),
         ("get_error_rate", {"minutes": 15, "service": "checkout-api"}),
         ("get_error_rate", {"service": "checkout-api", "minutes": 15})]
for name, arguments in calls:
    key = (name, json.dumps(arguments, sort_keys=True))
    seen[key] += 1
    if seen[key] >= 3:
        print(f"Loop: {name} called {seen[key]} times with the same arguments")
```

Stop the run with a clear reason, or, gentler, answer the repeat with an observation like "You
already called this with these arguments; the result won't change", and stop if it happens again.

## Approval gates

Some tools shouldn't run just because the model decided they should: sending a reminder to a
client's customer, restarting a production service, issuing a refund. Put an **approval gate** in
front of them. The gate takes an injected `approver(name, arguments) -> bool`: in tests it's a
function, in production a Slack message with Approve and Decline buttons (A1's webhooks).

```python
def gated(tool, approver):
    def run(**arguments):
        if not approver(tool.__name__, arguments):
            return {"error": f"A person declined {tool.__name__}. Don't retry it; tell the user what you would have done."}
        return tool(**arguments)
    return run

def send_reminder(invoice_id, to):
    return {"sent": invoice_id, "to": to}

asked = []
approver = lambda name, arguments: asked.append(arguments) or arguments["to"].endswith("@harbour.example")
reminder = gated(send_reminder, approver)
reminder(invoice_id="INV-2291", to="accounts@harbour.example"), reminder(invoice_id="INV-2291", to="me@gmail.example")
```

An approval is for **one exact call**. When a call fails and the model retries it, the retry can
be different: another address, a rewritten body, a larger amount. If your gate remembers "the
person approved `send_reminder`" rather than "the person approved *this* reminder", every retry
skips the person. Key approvals by the tool name and its canonical arguments, and remember
declines the same way, so a model can't wear a person down by asking again.

## Pause and resume

The person who approves may answer in ten seconds or in three hours. Don't hold a process open
waiting. **Pause**: save everything the run needs as JSON (the messages, the pending tool calls,
the counters), store it (a database row, keyed by run id), and return. When the approval webhook
arrives, load the state and **resume** exactly where you stopped.

```python
import json

state = {
    "messages": [
        {"role": "user", "content": "checkout-api is failing"},
        {"role": "assistant", "content": "", "tool_calls": [
            {"id": "call_7", "name": "restart_service", "arguments": {"service": "checkout-api"}}]},
    ],
    "pending": [{"id": "call_7", "name": "restart_service", "arguments": {"service": "checkout-api"}}],
    "steps": 3,
}
saved = json.dumps(state)                        # store this, and send the approval request

restored = json.loads(saved)                     # hours later, in another process
call = restored["pending"][0]
restored["messages"].append({"role": "tool", "tool_call_id": call["id"], "content": '{"restarted": true}'})
[m["role"] for m in restored["messages"]], restored["steps"]
```

This works because the neutral messages are plain dicts: nothing in the state is a live object.
The step count comes along too, so a paused run can't get a fresh step cap by being resumed.

## Frameworks, and when not to use one

You now have every piece of an agent framework: the loop, tools, memory, planning, patterns and
guardrails. Frameworks package these, and some add things that are real work to build yourself.

**LangGraph** models an agent as a graph of nodes over a shared state, with checkpoints so a run
can pause (for a person) and resume later:

```python norun
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph

graph = StateGraph(MessagesState)
graph.add_node("model", call_model)          # your function: state -> {"messages": [...]}
graph.add_node("tools", run_tools)
graph.add_edge(START, "model")
graph.add_conditional_edges("model", wants_tools, {"tools": "tools", "done": END})
graph.add_edge("tools", "model")
app = graph.compile(checkpointer=MemorySaver())
```

**The OpenAI Agents SDK** gives you agents with tools, handoffs between agents, guardrails and
tracing, with a turn limit on every run:

```python norun
from agents import Agent, Runner, function_tool

@function_tool
def get_error_rate(service: str) -> float:
    """Current 5xx rate for a service."""
    ...

agent = Agent(name="On-call helper", instructions="Investigate the alert, then answer.", tools=[get_error_rate])
result = Runner.run_sync(agent, "checkout-api 5xx rate is 7%", max_turns=8)
print(result.final_output)
```

**The Claude Agent SDK** is the harness behind Claude Code, as a library: built-in tools for
files, shell commands and web search, subagents, hooks, permissions and sessions. Custom tools
are exposed to it as MCP servers (module A6):

```python norun
import asyncio

from claude_agent_sdk import ClaudeAgentOptions, query

async def main():
    options = ClaudeAgentOptions(system_prompt="You are the on-call helper.",
                                 allowed_tools=["Read", "Grep"], max_turns=8)
    async for message in query(prompt="Why is checkout-api failing? The logs are in ./logs", options=options):
        print(message)

asyncio.run(main())
```

Others are worth knowing by name: **PydanticAI** (typed agents and outputs), **CrewAI**
(role-based multi-agent teams), **smolagents** (agents that write code as their actions) and
**LlamaIndex** (agents over RAG pipelines).

A framework earns its place when you need what it's good at: durable checkpoints and resumable
runs, a tracing UI, many agents handing work to each other, or built-in tools such as a sandboxed
shell. Write your own when the loop is small (most client jobs), when you need to stay
provider-neutral, when you want to test every path with a scripted fake, and when you have to
explain every token on the invoice. A good rule: write the loop first, and adopt a framework
when you notice you're rebuilding its features, not before. Pin its version either way; agent
frameworks change fast.

```quiz
question: A client wants an agent that drafts replies to five kinds of support email, with a person approving each one before it's sent. What's the strongest reason to write it yourself rather than adopt a framework?
options:
  - "Frameworks can't call tools"
  - "It's a small loop plus an approval gate, and your own code runs against both providers and is fully testable with your fakes"
  - "Frameworks don't support human approval"
answer: 1
explain: Most frameworks can do this, including approvals. The question is whether the dependency pays for itself. A job this size is a router, a short loop and a gate you already know how to build and test; a framework adds an API to learn, upgrades to track and behaviour you can't see.
```

## Where this leaves you

Offer and run only the allowed tools. Check the step cap, the worst-case cost and the deadline
before every call, and charge the actual cost after. Stop repeated identical calls early. Put
risky tools behind a gate keyed to the exact call, and pause to JSON when a person has to answer.
Reach for a framework when you need its checkpoints, tracing or built-in tools, not by default.
The drills build an allow-list, fix a budget checked too late, detect loops, fix an approval that
retries skip, combine every limit in one loop, and pause and resume a run for approval.
