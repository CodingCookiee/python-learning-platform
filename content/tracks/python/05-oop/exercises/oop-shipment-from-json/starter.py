import json
import re
from datetime import date


class Shipment:
    def __init__(self, tracking, weight_g, shipped):
        self.tracking = tracking
        self.weight_g = weight_g
        self.shipped = shipped

    # valid_tracking(code), from_json(text), to_json(), weight_kg, days_in_transit(today)
