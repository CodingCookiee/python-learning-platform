class Shipment:
    def __init__(self, tracking, weight_kg):
        """Store the tracking code and the weight in kilograms."""
        ...

    def label(self):
        """Return e.g. "RA123456785GB (2.5 kg)"."""
        ...
