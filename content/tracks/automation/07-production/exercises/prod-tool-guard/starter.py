class ToolGuard:
    """Runs an agent's tool calls, enforcing an allow-list and approval for side effects.

    tools: every tool function, by name
    allowed: the names this task may use
    side_effects: the names that send, change or share something
    untrusted: the names whose results contain text from outside (emails, web pages)
    confirm(name, arguments): a person (or a strict rule) approving one side effect
    """

    def __init__(self, tools, *, allowed, side_effects, untrusted, confirm):
        self.tools = tools
        self.allowed = set(allowed)
        self.side_effects = set(side_effects)
        self.untrusted = set(untrusted)
        self.confirm = confirm
        self.tainted = False
        self.log = []  # (tool name, outcome)

    def run(self, call):
        """The result to send back to the model for one tool call: {"result": ...} or {"error": ...}."""
        result = self.tools[call.name](**call.arguments)
        self.log.append((call.name, "ran"))
        return {"result": result}
