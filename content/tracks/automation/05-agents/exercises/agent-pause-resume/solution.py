import json
from dataclasses import dataclass

FINISH = {"name": "finish", "description": "Call this once, when you're done.",
          "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]}}
DECLINED = "A person declined {name}. Don't try it again; tell the user what you would have done instead."


@dataclass
class Outcome:
    status: str                 # finished | no_finish | step_limit | paused
    answer: str | None = None
    state: str | None = None    # JSON, when paused
    pending: list | None = None  # the risky calls waiting for a person, when paused


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def run_call(call: dict, registry) -> str:
    try:
        return json.dumps(registry[call["name"]](**call["arguments"]), default=str)
    except Exception as error:
        return json.dumps({"error": str(error)})


def tool_message(call: dict, content: str) -> dict:
    return {"role": "tool", "tool_call_id": call["id"], "content": content}


def continue_run(llm, messages, steps, tools, registry, risky, max_steps) -> Outcome:
    while steps < max_steps:
        response = llm.complete(messages, tools=[*tools, FINISH])
        steps += 1
        finish = next((c for c in response.tool_calls if c.name == "finish"), None)
        if finish is not None:
            return Outcome("finished", answer=finish.arguments.get("answer"))
        if not response.tool_calls:
            return Outcome("no_finish", answer=response.text)
        messages.append(assistant_message(response))
        calls = messages[-1]["tool_calls"]
        if any(call["name"] in risky for call in calls):
            state = json.dumps({"messages": messages, "pending": calls, "steps": steps})
            return Outcome("paused", state=state, pending=[call for call in calls if call["name"] in risky])
        for call in calls:
            messages.append(tool_message(call, run_call(call, registry)))
    return Outcome("step_limit")


def start_run(llm, task, tools, registry, *, risky, max_steps=8):
    """Run the agent until it finishes, or until it wants a risky tool."""
    return continue_run(llm, [{"role": "user", "content": task}], 0, tools, registry, set(risky), max_steps)


def resume_run(llm, state, *, approved, tools, registry, risky, max_steps=8):
    """Carry on a paused run, with the person's decision about its risky calls."""
    saved = json.loads(state)
    messages = saved["messages"]
    for call in saved["pending"]:
        if call["name"] in risky and not approved:
            content = json.dumps({"error": DECLINED.format(name=call["name"])})
        else:
            content = run_call(call, registry)
        messages.append(tool_message(call, content))
    return continue_run(llm, messages, saved["steps"], tools, registry, set(risky), max_steps)
