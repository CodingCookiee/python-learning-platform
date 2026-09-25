from dataclasses import dataclass, field
from datetime import date


@dataclass
class Booking:
    guest: str
    check_in: date
    check_out: date
    nightly_rate: float
    nights: int = field(init=False)
    total: float = field(init=False)

    def __post_init__(self):
        if isinstance(self.check_in, str):
            self.check_in = date.fromisoformat(self.check_in)
        if isinstance(self.check_out, str):
            self.check_out = date.fromisoformat(self.check_out)
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        if self.nightly_rate <= 0:
            raise ValueError("nightly_rate must be positive")
        self.nights = (self.check_out - self.check_in).days
        self.total = round(self.nights * self.nightly_rate, 2)
