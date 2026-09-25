from plp import test, hidden
from solution import Money


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Parses text and cents, and checks currency codes")
def _():
    price = Money.from_string("12.50 eur")
    assert (price.amount, price.currency) == (12.5, "EUR")
    assert Money.from_cents(1250, "EUR").amount == 12.5
    assert Money.is_currency_code("GBP") is True


@test("Refuses something that isn't a currency code")
def _():
    assert raises_value_error(lambda: Money.from_string("12.50 euro")), (
        'from_string("12.50 euro") should raise ValueError'
    )


@test("Returns the subclass when called on a subclass")
def _():
    class Price(Money):
        pass

    assert type(Price.from_string("9.99 GBP")) is Price
    assert type(Price.from_cents(999, "GBP")) is Price


@test("is_currency_code works on the class and on an instance")
def _():
    assert Money.is_currency_code("usd") is False
    assert Money(5, "USD").is_currency_code("USD") is True


@hidden("Tolerates extra spaces")
def _():
    price = Money.from_string("  7.25   usd ")
    assert (price.amount, price.currency) == (7.25, "USD")


@hidden("Rejects codes of the wrong length or with digits")
def _():
    assert Money.is_currency_code("EU") is False
    assert Money.is_currency_code("E1R") is False
    assert Money.is_currency_code("EURO") is False


@hidden("from_cents keeps the currency")
def _():
    refund = Money.from_cents(199, "USD")
    assert (refund.amount, refund.currency) == (1.99, "USD")
