from plp import test, hidden
import solution


@test("Admins describe themselves and can do anything")
def _():
    root = solution.Admin("Ada", "ada@example.com")
    assert root.describe() == "Ada <ada@example.com> (admin)"
    assert root.can("delete") is True
    assert isinstance(root, solution.User)


@test("Ordinary users are unchanged")
def _():
    grace = solution.User("Grace", "grace@example.com")
    assert grace.describe() == "Grace <grace@example.com>"
    assert grace.can("comment") is True
    assert grace.can("delete") is False


@test("Admins are created exactly like users")
def _():
    root = solution.Admin("Ada", "ada@example.com")
    assert (root.name, root.email) == ("Ada", "ada@example.com")


@hidden("describe() builds on User.describe rather than copying it")
def _():
    original = solution.User.describe
    solution.User.describe = lambda self: f"{self.name} [{self.email}]"
    try:
        result = solution.Admin("Ada", "ada@example.com").describe()
    finally:
        solution.User.describe = original
    assert result == "Ada [ada@example.com] (admin)", "Admin.describe should call super().describe()"
