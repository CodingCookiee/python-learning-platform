---
slug: fixtures
title: Fixtures and their scopes
summary: Setup your tests ask for by name, teardown with yield, and how long each fixture lives.
minutes: 40
exercises:
  - pytest-cart-fixture
  - pytest-predict-fixture-scope
  - pytest-yield-cleanup
  - pytest-exchange-rates-scope
---

Most tests need something set up first: a cart with items in it, a customer, a connection to a
test database. Copying those lines into every test buries what each test is actually checking,
and when the setup changes you edit twenty tests. pytest's answer is the **fixture**: setup code
with a name, which a test asks for by listing that name as a parameter.

## A fixture is setup a test asks for

Here's the wrong way first. Three tests, three copies of the same cart:

```python norun
from cart import Cart


def test_total_includes_every_line():
    cart = Cart()
    cart.add("MUG", 2, 800)
    cart.add("TEA", 1, 350)
    assert cart.total_pence == 1950


def test_item_count_counts_units():
    cart = Cart()
    cart.add("MUG", 2, 800)
    cart.add("TEA", 1, 350)
    assert cart.item_count == 3
```

Move the setup into a function decorated with `@pytest.fixture`, and give each test a parameter
with the fixture's name:

```python norun
import pytest
from cart import Cart


@pytest.fixture
def cart():
    cart = Cart()
    cart.add("MUG", 2, 800)
    cart.add("TEA", 1, 350)
    return cart


def test_total_includes_every_line(cart):
    assert cart.total_pence == 1950


def test_item_count_counts_units(cart):
    assert cart.item_count == 3
```

You never call `cart()` yourself. Here's what pytest does instead, for each test:

1. It reads the test function's **parameter names** (with `inspect.signature`, the same tool you
   could use yourself). Here the only one is `cart`.
2. It looks up a fixture registered under that name: in the test file, then in `conftest.py`
   files, then in pytest's built-in fixtures and plugins.
3. It calls the fixture, and passes whatever it returns as the argument.

The matching is **by name only**. A parameter called `basket` gets the `basket` fixture or an
error: `fixture 'basket' not found`, followed by a list of the fixtures that do exist. And each
test gets its own fresh cart, so one test adding a line can't affect another.

> [!JS]
> Coming from Jest: `beforeEach` assigns to a variable that every test in the `describe` shares.
> A fixture is the opposite way round: each test names the setup it needs, and gets its own copy.

```quiz
question: A test is defined as `def test_refund(order, customer):`. How does pytest decide what to pass as `customer`?
options:
  - "By position: the second fixture defined in the file"
  - "By name: it calls the fixture function named customer"
  - "By type hint: whatever returns a Customer"
answer: 1
explain: pytest matches parameters to fixtures by name. The order they're defined in and any type hints don't matter.
```

## Fixtures can use fixtures

A fixture can ask for other fixtures in exactly the same way, and pytest builds the chain for you.
When a test needs data that varies, a fixture can return a **factory**, a function that builds
one each time it's called:

```python norun
@pytest.fixture
def customer():
    return Customer(name="Ada Lovelace", email="ada@example.com")


@pytest.fixture
def make_order(customer):             # uses the customer fixture
    def make(*lines):
        order = Order(customer)
        for sku, quantity, price in lines:
            order.add(sku, quantity, price)
        return order
    return make


def test_large_orders_ship_free(make_order):
    order = make_order(("DESK", 1, 24_900))
    assert order.shipping_pence == 0
```

The factory is a closure (module 3): `make` remembers `customer` from the fixture that created it.
Each test states only what's special about it, and the boring parts stay in one place.

## Teardown with yield

Some setup has to be undone: a file deleted, a connection closed, a test account removed from a
shared database. Write the fixture with `yield` instead of `return`. The code before the `yield`
is setup, the yielded value goes to the test, and the code after the `yield` is teardown, which
pytest runs once the test is over, **whether it passed or failed**.

Run this. It writes a test file with a yield fixture, and runs it with printing switched on
(`-s`) and pytest's own report switched off, so you see only the order things happen in:

```python
import os
import tempfile

import pytest

TESTS = '''
import pytest

@pytest.fixture
def account():
    print("create test account")
    yield {"email": "ada@example.com", "plan": "free"}
    print("delete test account")

def test_new_accounts_are_free(account):
    print("  test: plan is", account["plan"])
    assert account["plan"] == "free"

def test_upgrade(account):
    print("  test: upgrading, then failing")
    account["plan"] = "pro"
    assert account["plan"] == "team"
'''

os.chdir(tempfile.mkdtemp())
with open("test_accounts.py", "w") as file:
    file.write(TESTS)

pytest.main(["-s", "-p", "no:terminal", "-p", "no:cacheprovider", "-p", "no:faulthandler"])
```

The second test fails, and its account is still deleted. It's the same guarantee a `with` block
gives you (module 6), and for the same reason: cleanup that only runs on success leaves a mess
exactly when something has gone wrong. Notice too that "create" and "delete" appear around each
test: every test gets an account of its own, so the second test's upgrade can't leak into a third.

> [!TIP]
> If a fixture wraps something that's already a context manager, yield inside its `with`:
> `with open_ledger() as ledger: yield ledger`. The `with` does the teardown for you.

## Scope: how long a fixture lives

By default a fixture has **function scope**: it runs once per test that asks for it. Pass
`scope=` to keep its value for longer:

| Scope | Created once per… | Good for |
|-------|-------------------|----------|
| `"function"` (default) | test | anything a test might change |
| `"class"` | test class | setup shared by the methods of one `Test` class |
| `"module"` | test file | an expensive read-only resource used by one file |
| `"session"` | whole test run | a test database, a server, a big price list |

pytest caches the value for the scope and runs the teardown when the scope ends: after the last
test in the file for `"module"`, at the very end for `"session"`. Loading a price list from a slow
service once instead of fifty times can take a suite from minutes to seconds.

Now the wrong way. A wider scope means the tests share **one object**, so a test that changes it
changes it for everyone after it:

```python norun
@pytest.fixture(scope="module")      # one cart for the whole file
def cart():
    cart = Cart()
    cart.add("MUG", 2, 800)
    return cart


def test_removing_the_mug_empties_the_cart(cart):
    cart.remove("MUG")
    assert cart.total_pence == 0


def test_cart_has_the_mug(cart):     # fails: the test above removed it
    assert cart.item_count == 2
```

The second test fails, but only when the first runs before it. Tests that pass or fail depending on
their order are among the most expensive bugs a suite can have. Widen the scope only for things
tests never change, and keep everything a test might modify function-scoped.

```quiz
question: Twenty tests read exchange rates from a fixture that downloads them (slowly), and one test adds a made-up currency to the dict it gets. What should you do?
options:
  - "Make the fixture session-scoped, and let that one test modify the shared dict"
  - "Make the fixture session-scoped, and have that one test copy the dict before changing it"
  - "Keep it function-scoped, so each test downloads its own rates"
answer: 1
explain: The rates are expensive and read-only for nineteen tests, so share them. The one test that needs a change works on its own copy (dict(rates)), so it can't affect the others.
```

## Sharing fixtures with conftest.py

A fixture defined in a test file is available to the tests in that file. Put it in a file called
`conftest.py` instead, and every test in that folder and below can ask for it, with no import:
pytest loads `conftest.py` files itself while collecting.

```text
tests/
  conftest.py          # defines cart, customer, make_order
  test_checkout.py     # def test_...(cart): ... just works
  test_refunds.py
```

pytest also ships fixtures of its own, and you ask for them the same way. The next lessons use
three of them: `monkeypatch`, `tmp_path` and `capsys`. `pytest --fixtures` lists every fixture
available where you run it.

## Where this leaves you

A fixture is a named setup function, and a test gets its value by having a parameter with the
same name. Fixtures can use other fixtures or return factories. `yield` splits setup from
teardown, and teardown runs even when the test fails. Scope decides how long a value is shared:
keep it per test unless it's expensive and nobody changes it.
