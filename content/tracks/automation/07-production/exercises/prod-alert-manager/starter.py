from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    name: str
    metric: str
    op: str  # ">" or "<"
    threshold: float
    for_checks: int = 1  # consecutive breaching checks before it fires


@dataclass(frozen=True)
class Event:
    rule: str
    state: str  # "firing" or "resolved"
    value: float


class AlertManager:
    """Threshold alerts that fire once after a sustained breach and resolve once."""

    def __init__(self, rules):
        self.rules = list(rules)

    @property
    def firing(self):
        """The names of the rules firing now, in rule order."""
        ...

    def check(self, metrics):
        """Evaluate every rule against one set of metrics; return what changed."""
        events = []
        for rule in self.rules:
            value = metrics[rule.metric]
            breached = value > rule.threshold if rule.op == ">" else value < rule.threshold
            if breached:
                events.append(Event(rule.name, "firing", value))
        return events
