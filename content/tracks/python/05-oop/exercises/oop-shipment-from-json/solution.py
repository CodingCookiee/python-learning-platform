import json
import re
from datetime import date


class Shipment:
    def __init__(self, tracking, weight_g, shipped):
        if not self.valid_tracking(tracking):
            raise ValueError(f"Invalid tracking code: {tracking!r}")
        if weight_g <= 0:
            raise ValueError(f"Weight must be positive: {weight_g}")
        self.tracking = tracking
        self.weight_g = weight_g
        self.shipped = shipped

    @staticmethod
    def valid_tracking(code):
        return re.fullmatch(r"[A-Z]{2}\d{9}[A-Z]{2}", code) is not None

    @classmethod
    def from_json(cls, text):
        data = json.loads(text)
        return cls(data["tracking"], data["weight_g"], date.fromisoformat(data["shipped"]))

    def to_json(self):
        return json.dumps(
            {"tracking": self.tracking, "weight_g": self.weight_g, "shipped": self.shipped.isoformat()}
        )

    @property
    def weight_kg(self):
        return self.weight_g / 1000

    def days_in_transit(self, today):
        return (today - self.shipped).days
