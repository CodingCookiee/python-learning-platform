from collections import Counter
from dataclasses import dataclass, replace


@dataclass
class Address:
    street: str
    city: str
    postcode: str
    country: str = "GB"

    def with_postcode(self, postcode):
        ...

    def label(self):
        ...


def deliveries_per_address(addresses):
    ...
