OPERATIONS = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
    "/": lambda a, b: a / b,
}


def calculate(expression, extra=None):
    """Return the float result of "number operator number", e.g. calculate("12 * 3") == 36.0.

    extra is an optional dict of additional operators: {symbol: function of two numbers}.
    """
    parts = expression.split()
    if len(parts) != 3:
        raise ValueError('Expected "number operator number"')
    left, symbol, right = parts
    table = OPERATIONS if extra is None else OPERATIONS | extra
    if symbol not in table:
        raise ValueError(f"Unknown operator: {symbol}")
    return float(table[symbol](float(left), float(right)))
