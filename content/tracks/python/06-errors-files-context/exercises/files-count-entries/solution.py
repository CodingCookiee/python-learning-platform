def count_entries(path):
    """How many non-blank lines the UTF-8 text file at path has."""
    with open(path, encoding="utf-8") as file:
        return sum(1 for line in file if line.strip())
