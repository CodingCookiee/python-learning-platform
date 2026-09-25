def make_change(cents):
    """Return (25s, 10s, 5s, 1s): the coins to pay out cents, biggest coins first."""
    quarters, cents = divmod(cents, 25)
    dimes, cents = divmod(cents, 10)
    nickels, pennies = divmod(cents, 5)
    return quarters, dimes, nickels, pennies
