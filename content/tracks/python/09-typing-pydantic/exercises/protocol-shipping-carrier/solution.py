from collections.abc import Iterable
from typing import Protocol


class Carrier(Protocol):
    name: str

    def quote(self, weight_grams: int, country: str) -> int: ...


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


def cheapest_quote(carriers: Iterable[Carrier], weight_grams: int, country: str) -> tuple[str, int]:
    """The (name, cents) of the carrier with the lowest quote."""
    quotes = [(carrier.name, carrier.quote(weight_grams, country)) for carrier in carriers]
    if not quotes:
        raise ValueError("no carriers to quote")
    return min(quotes, key=lambda quote: quote[1])
