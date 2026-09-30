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
        name = call.name
        if name not in self.allowed or name not in self.tools:
            self.log.append((name, "blocked"))
            return {"error": f"Tool {name} is not available for this task"}

        outcome = "ran"
        if name in self.side_effects and self.tainted:
            if not self.confirm(name, dict(call.arguments)):
                self.log.append((name, "declined"))
                return {"error": f"{name} needs approval after reading untrusted content, and it was declined"}
            outcome = "approved"

        try:
            result = self.tools[name](**call.arguments)
        except Exception as error:
            self.log.append((name, "failed"))
            return {"error": f"{type(error).__name__}: {error}"}
        if name in self.untrusted:
            self.tainted = True
        self.log.append((name, outcome))
        return {"result": result}
