class Supplier:
    def __init__(self, name, country, lead_time_days=14):
        self.name = name
        self.country = country
        self.lead_time_days = lead_time_days

    def __repr__(self):
        return (
            f"Supplier(name={self.name!r}, country={self.country!r}, "
            f"lead_time_days={self.lead_time_days!r})"
        )

    def __eq__(self, other):
        if not isinstance(other, Supplier):
            return NotImplemented
        return (self.name, self.country, self.lead_time_days) == (
            other.name,
            other.country,
            other.lead_time_days,
        )

    def ships_within(self, days):
        return self.lead_time_days <= days
