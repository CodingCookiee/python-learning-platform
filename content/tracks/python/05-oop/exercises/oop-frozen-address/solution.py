from collections import Counter
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Address:
    street: str
    city: str
    postcode: str
    country: str = "GB"

    def with_postcode(self, postcode):
        return replace(self, postcode=postcode)

    def label(self):
        return f"{self.street}\n{self.city} {self.postcode}\n{self.country}"


def deliveries_per_address(addresses):
    return Counter(addresses)
