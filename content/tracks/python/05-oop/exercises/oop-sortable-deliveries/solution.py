from dataclasses import dataclass, field
from datetime import date
from itertools import groupby


@dataclass(order=True, slots=True)
class Delivery:
    eta: date
    priority: int
    tracking: str
    notes: list = field(default_factory=list, compare=False)

    def add_note(self, text):
        self.notes.append(text)


def overdue(deliveries, today):
    return sorted(delivery for delivery in deliveries if delivery.eta < today)


def by_day(deliveries):
    return {
        eta: [delivery.tracking for delivery in group]
        for eta, group in groupby(sorted(deliveries), key=lambda delivery: delivery.eta)
    }
