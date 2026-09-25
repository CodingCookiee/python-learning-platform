def export_csv(rows, *, include_header=True, delimiter=",", quote_all=False):
    """Return rows (dicts that all have the same keys) as CSV text."""
    columns = list(rows[0]) if rows else []
    lines = []
    if include_header:
        lines.append(delimiter.join(columns))
    for row in rows:
        values = [str(row[column]) for column in columns]
        if quote_all:
            values = [f'"{value}"' for value in values]
        lines.append(delimiter.join(values))
    return "\n".join(lines)
