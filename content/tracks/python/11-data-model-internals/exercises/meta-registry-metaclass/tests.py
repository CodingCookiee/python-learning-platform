from plp import test, hidden, raises
from solution import RegistryMeta


def payment_methods():
    class PaymentMethod(metaclass=RegistryMeta):
        pass

    class Card(PaymentMethod):
        code = "card"

    class BankTransfer(PaymentMethod):
        code = "bank"

    return PaymentMethod, Card, BankTransfer


@test("The class supports len, in, indexing and iteration")
def _():
    PaymentMethod, Card, BankTransfer = payment_methods()
    assert len(PaymentMethod) == 2
    assert ("card" in PaymentMethod) is True
    assert PaymentMethod["bank"] is BankTransfer
    assert list(PaymentMethod) == [Card, BankTransfer]


@test("Unknown codes")
def _():
    PaymentMethod, _, _ = payment_methods()
    assert "crypto" not in PaymentMethod
    with raises(KeyError, what='PaymentMethod["crypto"]'):
        PaymentMethod["crypto"]


@test("The behaviour lives on the metaclass")
def _():
    PaymentMethod, Card, _ = payment_methods()
    assert type(PaymentMethod) is RegistryMeta
    assert type(Card) is RegistryMeta
    for method in ("__len__", "__iter__", "__contains__", "__getitem__"):
        assert method in vars(RegistryMeta), f"RegistryMeta should define {method}"


@hidden("Any class in the family sees the same registry")
def _():
    PaymentMethod, Card, BankTransfer = payment_methods()

    class Voucher(PaymentMethod):
        code = "voucher"

    assert len(Card) == 3
    assert Card["voucher"] is Voucher
    assert [cls.__name__ for cls in BankTransfer] == ["Card", "BankTransfer", "Voucher"]


@hidden("Only a class's own code registers it, and codes are unique")
def _():
    PaymentMethod, Card, _ = payment_methods()

    class CorporateCard(Card):
        pass

    class DebitCard(Card):
        code = "debit"

    assert list(PaymentMethod)[-1] is DebitCard
    assert CorporateCard not in list(PaymentMethod)
    with raises(TypeError, match="card", what="class AnotherCard(PaymentMethod): code = 'card'"):
        class AnotherCard(PaymentMethod):
            code = "card"
    assert PaymentMethod["card"] is Card


@hidden("Separate roots have separate registries")
def _():
    PaymentMethod, _, _ = payment_methods()

    class ShippingMethod(metaclass=RegistryMeta):
        pass

    class Courier(ShippingMethod):
        code = "courier"

    class Collection(ShippingMethod):
        code = "card"          # the same code is fine in another family

    assert len(ShippingMethod) == 2
    assert len(PaymentMethod) == 2
    assert ShippingMethod["card"] is Collection
    assert "courier" not in PaymentMethod
