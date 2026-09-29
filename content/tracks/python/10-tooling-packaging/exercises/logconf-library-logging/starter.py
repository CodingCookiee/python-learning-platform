import logging

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(message)s")


def charge(invoice_number, amount):
    """Charge an invoice and return a receipt id, or None if the amount isn't positive."""
    if amount <= 0:
        logging.warning("Refusing to charge %s: amount %.2f", invoice_number, amount)
        return None
    logging.info("Charging %s for %.2f", invoice_number, amount)
    print(f"charged {invoice_number}")
    return f"rcpt-{invoice_number.lower()}"
