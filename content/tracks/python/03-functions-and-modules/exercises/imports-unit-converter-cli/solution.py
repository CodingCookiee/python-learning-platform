TO_METRES = {
    "mm": 0.001,
    "cm": 0.01,
    "m": 1,
    "km": 1000,
    "in": 0.0254,
    "ft": 0.3048,
    "mi": 1609.344,
}


def convert(value, from_unit, to_unit):
    """Return value converted from from_unit to to_unit, rounded to 2 decimal places."""
    for unit in (from_unit, to_unit):
        if unit not in TO_METRES:
            raise ValueError(f"Unknown unit: {unit}")
    return round(value * TO_METRES[from_unit] / TO_METRES[to_unit], 2)


def parse_request(line):
    """Turn "12.5 km to mi" into (12.5, "km", "mi")."""
    words = line.split()
    if len(words) != 4 or words[2] != "to":
        raise ValueError('Expected "<number> <unit> to <unit>"')
    number, from_unit, _, to_unit = words
    return float(number), from_unit, to_unit


def main():
    """Read request lines until a blank one, printing each conversion or error."""
    while True:
        line = input("> ")
        if not line:
            break
        try:
            value, from_unit, to_unit = parse_request(line)
            result = convert(value, from_unit, to_unit)
            print(f"{value:g} {from_unit} = {result:.2f} {to_unit}")
        except ValueError as error:
            print(f"Error: {error}")


if __name__ == "__main__":
    main()
