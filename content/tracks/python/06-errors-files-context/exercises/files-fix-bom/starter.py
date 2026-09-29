def statement_columns(path):
    """The column names on the first line of a bank statement export."""
    with open(path) as file:
        header = file.readline()
    return header.split(",")
