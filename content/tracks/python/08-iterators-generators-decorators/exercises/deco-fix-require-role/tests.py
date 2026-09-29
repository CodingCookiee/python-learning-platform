from plp import test, hidden, raises
from solution import delete_customer, issue_refund, require_role

ADA = {"name": "Ada", "roles": {"admin", "billing"}}
GRACE = {"name": "Grace", "roles": {"support"}}


@test("Admins can delete, others can't")
def _():
    assert delete_customer(ADA, "C42") == "Ada deleted C42"
    with raises(PermissionError, match="Grace needs the admin role"):
        delete_customer(GRACE, "C42")


@test("Each function checks its own role")
def _():
    linus = {"name": "Linus", "roles": {"billing"}}
    assert issue_refund(linus, "A1", 12.5) == "Linus refunded 12.50 on A1"
    with raises(PermissionError, match="Linus needs the admin role"):
        delete_customer(linus, "C42")


@test("Keeps names and docstrings")
def _():
    assert (delete_customer.__name__, issue_refund.__name__) == ("delete_customer", "issue_refund")
    assert delete_customer.__doc__ == "Permanently delete a customer record."


@hidden("A refused call doesn't run the function")
def _():
    ran = []

    @require_role("admin")
    def purge_logs(user):
        ran.append(user["name"])

    raises(PermissionError, purge_logs, GRACE)
    assert ran == []
    purge_logs(ADA)
    assert ran == ["Ada"]


@hidden("Keyword arguments pass through")
def _():
    assert issue_refund(ADA, amount=3, order_id="A9") == "Ada refunded 3.00 on A9"
