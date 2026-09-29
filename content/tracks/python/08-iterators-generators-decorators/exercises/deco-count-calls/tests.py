from plp import test, hidden, raises
from solution import count_calls


@test("Counts calls and passes arguments through")
def _():
    @count_calls
    def list_orders(customer_id, *, status="open"):
        """Orders for one customer."""
        return f"{status} orders for {customer_id}"

    assert list_orders("C1") == "open orders for C1"
    assert list_orders("C2", status="shipped") == "shipped orders for C2"
    assert list_orders.calls == 2


@test("Keeps the name and docstring")
def _():
    @count_calls
    def list_orders(customer_id):
        """Orders for one customer."""

    assert list_orders.__name__ == "list_orders"
    assert list_orders.__doc__ == "Orders for one customer."
    assert hasattr(list_orders, "__wrapped__"), "use functools.wraps, which also sets __wrapped__"


@test("Starts at zero")
def _():
    @count_calls
    def health_check():
        return "ok"

    assert health_check.calls == 0


@hidden("Each decorated function has its own count")
def _():
    @count_calls
    def get_order(order_id):
        return order_id

    @count_calls
    def cancel_order(order_id):
        return order_id

    get_order("A1")
    get_order("A2")
    cancel_order("A1")
    assert (get_order.calls, cancel_order.calls) == (2, 1)


@hidden("A call that raises still counts, and the error isn't swallowed")
def _():
    @count_calls
    def refund(amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        return amount

    raises(ValueError, refund, 0)
    assert refund(5) == 5
    assert refund.calls == 2
