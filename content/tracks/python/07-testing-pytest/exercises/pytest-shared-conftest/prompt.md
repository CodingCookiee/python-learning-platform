The cart's tests have been split into two files. Your teammate wrote `test_discounts.py`, which
asks for two fixtures: `cart` (2 × `"MUG"` at 800 and 1 × `"TEA"` at 350, 1950p in all) and
`member` (a `Customer` who is a member). Run the tests now and every one of theirs errors with
`fixture 'cart' not found`: the only `cart` fixture lives inside `test_cart.py`, where no other
file can see it.

1. **In `conftest.py`:** define the `cart` fixture and a `member` fixture that returns
   `Customer("Amira", member=True)`. Every test file in the folder can ask for them by name.
2. **In `test_cart.py`:** remove its own copy of `cart`, so there's one fixture to keep up to date,
   and keep its two tests.
3. **Add a test to `test_cart.py`** that uses `member` and checks the edge of the discount: a
   member's order of exactly 1000p gets 10% off.

`cart.py` and `test_discounts.py` are read-only: open their tabs to see what they expect. Your tests
are graded the usual way, by running all of them against `cart.py` and against copies of it with
bugs planted in them.
