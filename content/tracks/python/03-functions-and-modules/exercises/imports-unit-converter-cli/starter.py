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
    ...


def parse_request(line):
    """Turn "12.5 km to mi" into (12.5, "km", "mi")."""
    ...


def main():
    """Read request lines until a blank one, printing each conversion or error."""
    ...


# Call main() here, but only when the file is run as a script
