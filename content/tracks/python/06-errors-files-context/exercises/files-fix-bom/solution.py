def statement_columns(path):
    """The column names on the first line of a bank statement export."""
    with open(path, encoding="utf-8-sig") as file:
        header = file.readline()
    return [name.strip() for name in header.split(",")]
