import re

ORDER_ID = re.compile(r"\bORD-\d{4,}\b")


def find_order_ids(text):
    """Every order id like ORD-1042 (four or more digits) in text, in order."""
    return ORDER_ID.findall(text)
