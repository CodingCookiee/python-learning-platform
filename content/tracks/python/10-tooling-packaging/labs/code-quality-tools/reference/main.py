def parse_quantity(text: str) -> int:
    """The quantity in text, or 0 if it is not a whole number."""
    try:
        return int(text)
    except ValueError:
        return 0


def main() -> None:
    print(parse_quantity("12"))


if __name__ == "__main__":
    main()
