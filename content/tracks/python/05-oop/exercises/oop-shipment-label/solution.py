class Shipment:
    def __init__(self, tracking, weight_kg):
        """Store the tracking code and the weight in kilograms."""
        self.tracking = tracking
        self.weight_kg = weight_kg

    def label(self):
        """Return e.g. "RA123456785GB (2.5 kg)"."""
        return f"{self.tracking} ({self.weight_kg} kg)"
