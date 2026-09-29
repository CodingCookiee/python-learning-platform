import json

DECLINED = "A person declined {name}. Don't retry it; tell the user what you would have done."


class ApprovalGate:
    """Runs tools, asking a person first for the risky ones."""

    def __init__(self, registry, *, risky, approver):
        self.registry = registry
        self.risky = set(risky)
        self.approver = approver
        self.approved = set()

    def run(self, name, arguments):
        if name in self.risky and name not in self.approved:
            if not self.approver(name, arguments):
                return {"error": DECLINED.format(name=name)}
            self.approved.add(name)
        return self.registry[name](**arguments)


def run_agent(llm, task, tools, gate, *, max_steps=6):
    """A small agent loop that runs every tool call through the gate."""
    messages = [{"role": "user", "content": task}]
    for _ in range(max_steps):
        response = llm.complete(messages, tools=tools)
        if not response.tool_calls:
            return response.text
        messages.append({"role": "assistant", "content": response.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]})
        for call in response.tool_calls:
            try:
                content = json.dumps(gate.run(call.name, call.arguments), default=str)
            except Exception as error:
                content = json.dumps({"error": str(error)})
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
    return None
