from dataclasses import dataclass, field
from datetime import date


@dataclass
class Booking:
    guest: str
    check_in: date
    check_out: date
    nightly_rate: float
