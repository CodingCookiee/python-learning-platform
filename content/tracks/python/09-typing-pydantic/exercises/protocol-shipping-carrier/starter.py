from collections.abc import Iterable
from typing import Protocol

# Carrier: a name (str) and quote(weight_grams: int, country: str) -> int, in cents


class RoyalMail:
    name = "Royal Mail"

    def quote(self, weight_grams: int, country: str) -> int:
        return 385 if country == "GB" else 1250 + weight_grams // 100 * 20


class DHLExpress:
    name = "DHL Express"

    def quote(self, weight_grams: int, country: str) -> int:
        return 999 + weight_grams // 500 * 150


class LegacyCourier:
    name = "Legacy Courier"

    def quote(self, weight_kg: float) -> float:
        return 7.5 * weight_kg


def cheapest_quote(carriers, weight_grams, country):
    """The (name, cents) of the carrier with the lowest quote."""
    ...
