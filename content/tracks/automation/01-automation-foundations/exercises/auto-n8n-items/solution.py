def to_items(rows):
    """Wrap each row as an n8n item: {"json": <a copy of the row>}."""
    return [{"json": dict(row)} for row in rows]
