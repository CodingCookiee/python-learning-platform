from plp import test, hidden
from solution import User


def reset():
    User.by_email.clear()


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Registers users by normalised email and refuses duplicates")
def _():
    reset()
    ada = User("  Ada@Example.com ", "Ada")
    assert ada.email == "ada@example.com"
    assert User.by_email["ada@example.com"] is ada
    assert raises_value_error(lambda: User("ADA@example.com", "Impostor")), (
        "A second user with the same email should raise ValueError"
    )


@test("Promotes one role at a time, and admins stay admins")
def _():
    reset()
    ada = User("ada@example.com", "Ada")
    ada.promote()
    assert ada.role == "editor"
    ada.promote()
    ada.promote()
    assert ada.role == "admin"


@test("The registry is one dict on the class, shared by every user")
def _():
    reset()
    ada = User("ada@example.com", "Ada")
    grace = User("grace@example.com", "Grace", role="editor")
    assert isinstance(vars(User).get("by_email"), dict), "by_email should be a dict on the class"
    assert "by_email" not in vars(ada), "Each user shouldn't have its own by_email"
    assert User.by_email == {"ada@example.com": ada, "grace@example.com": grace}


@test("Refuses an unknown role, without registering the user")
def _():
    reset()
    assert raises_value_error(lambda: User("root@example.com", "Root", role="superuser")), (
        "role='superuser' should raise ValueError"
    )
    assert "root@example.com" not in User.by_email


@hidden("A refused duplicate leaves the original registered")
def _():
    reset()
    ada = User("ada@example.com", "Ada")
    raises_value_error(lambda: User("ada@example.com", "Impostor"))
    assert User.by_email["ada@example.com"] is ada
    assert User.by_email["ada@example.com"].name == "Ada"


@hidden("remove() frees the email for a new account")
def _():
    reset()
    old = User("ops@example.com", "Old ops")
    old.remove()
    assert "ops@example.com" not in User.by_email
    new = User("ops@example.com", "New ops")
    assert User.by_email["ops@example.com"] is new


@hidden("ROLES is ordered by rank")
def _():
    assert User.ROLES == ("member", "editor", "admin")
