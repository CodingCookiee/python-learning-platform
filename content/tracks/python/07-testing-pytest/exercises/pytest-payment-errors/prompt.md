The card gateway reports each kind of failure with its own exception, and callers depend on the
difference: an expired card asks the customer for a new card, a declined one shows the reason.

```python
# gateway.py
from dataclasses import dataclass


class PaymentError(Exception):
    """Base class for every payment failure."""


class CardExpired(PaymentError):
    pass


class CardDeclined(PaymentError):
    def __init__(self, code):
        super().__init__(f"card declined: {code}")
        self.code = code


@dataclass
class Card:
    number: str
    expiry_year: int
    expiry_month: int
    limit_pence: int


def authorize(card, amount_pence, today):
    """Authorize a payment and return a code like "AUTH-4242-1999".

    A card is valid until the end of its expiry month. Raises CardExpired for an
    expired card, and CardDeclined with code "invalid_amount" for an amount that
    isn't positive, or "limit_exceeded" for one above the card's limit.
    """
    if (today.year, today.month) > (card.expiry_year, card.expiry_month):
        raise CardExpired(f"card ending {card.number[-4:]} expired {card.expiry_month:02}/{card.expiry_year}")
    if amount_pence <= 0:
        raise CardDeclined("invalid_amount")
    if amount_pence > card.limit_pence:
        raise CardDeclined("limit_exceeded")
    return f"AUTH-{card.number[-4:]}-{amount_pence}"
```

```python
card = Card("4000056655665556", 2026, 9, limit_pence=50_000)
authorize(card, 1999, today=date(2026, 9, 30))    # "AUTH-5556-1999"
authorize(card, 1999, today=date(2026, 10, 1))    # CardExpired
authorize(card, 60_000, today=date(2026, 9, 30))  # CardDeclined, with .code == "limit_exceeded"
```

Write `test_gateway.py`. For each failure, check the **specific** exception class (not just
`PaymentError`), and for `CardDeclined` check its `code` attribute. Your tests must pass on this
code and catch the bugs planted in copies of it.
