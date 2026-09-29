from plp import test, hidden
from solution import global_names

VAT = 0.2
sales = 0


def invoice_total(lines):
    subtotal = sum(line.total for line in lines)
    fee = lambda amount: max(amount * FEE_RATE, MINIMUM_FEE)  # noqa: E731, F821
    return round(subtotal * (1 + VAT) + fee(subtotal), 2)


def with_vat(net):
    return round(net * (1 + VAT), 2)


def only_locals(price, quantity):
    total = price * quantity
    return total


def reads_attributes(order):
    return order.customer.email.lower()


def record_sale(amount):
    global sales
    sales += amount
    return sales


def report(orders):
    def line(order):
        def money(value):
            return format(value, ",.2f")

        return f"{order.number}: {money(order.total)} {CURRENCY}"  # noqa: F821

    return "\n".join(line(order) for order in sorted(orders, key=SORT_KEY))  # noqa: F821


@test("Finds globals and built-ins, including inside a lambda")
def _():
    assert global_names(invoice_total) == ["FEE_RATE", "MINIMUM_FEE", "VAT", "max", "round", "sum"]


@test("A simple function")
def _():
    assert global_names(with_vat) == ["VAT", "round"]


@test("Locals, parameters and attribute names aren't globals")
def _():
    assert global_names(only_locals) == []
    assert global_names(reads_attributes) == []


@hidden("A name declared global is a global")
def _():
    assert global_names(record_sale) == ["sales"]


@hidden("Looks inside functions nested at any depth, each name once")
def _():
    assert global_names(report) == ["CURRENCY", "SORT_KEY", "format", "sorted"]
