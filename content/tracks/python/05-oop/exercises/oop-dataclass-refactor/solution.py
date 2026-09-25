from dataclasses import dataclass


@dataclass
class Supplier:
    name: str
    country: str
    lead_time_days: int = 14

    def ships_within(self, days):
        return self.lead_time_days <= days
