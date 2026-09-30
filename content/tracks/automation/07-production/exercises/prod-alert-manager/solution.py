import operator
from dataclasses import dataclass

OPERATORS = {">": operator.gt, "<": operator.lt}


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

    def __init__(self, rules: list[Rule]):
        for rule in rules:
            if rule.op not in OPERATORS:
                raise ValueError(f"Rule {rule.name!r} has unknown operator {rule.op!r}")
            if rule.for_checks < 1:
                raise ValueError(f"Rule {rule.name!r} needs for_checks of at least 1")
        self.rules = list(rules)
        self._streaks = {rule.name: 0 for rule in rules}
        self._firing: set[str] = set()

    @property
    def firing(self) -> list[str]:
        return [rule.name for rule in self.rules if rule.name in self._firing]

    def check(self, metrics: dict) -> list[Event]:
        """Evaluate every rule against one set of metrics; return what changed."""
        events = []
        for rule in self.rules:
            value = metrics.get(rule.metric)
            if value is None:
                continue  # no data this time: leave the rule as it is
            if OPERATORS[rule.op](value, rule.threshold):
                self._streaks[rule.name] += 1
                if rule.name not in self._firing and self._streaks[rule.name] >= rule.for_checks:
                    self._firing.add(rule.name)
                    events.append(Event(rule.name, "firing", value))
            else:
                self._streaks[rule.name] = 0
                if rule.name in self._firing:
                    self._firing.discard(rule.name)
                    events.append(Event(rule.name, "resolved", value))
        return events
