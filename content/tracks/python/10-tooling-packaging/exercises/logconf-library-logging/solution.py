import logging

logger = logging.getLogger(__name__)


def charge(invoice_number, amount):
    """Charge an invoice and return a receipt id, or None if the amount isn't positive."""
    if amount <= 0:
        logger.warning("Refusing to charge %s: amount %.2f", invoice_number, amount)
        return None
    logger.info("Charging %s for %.2f", invoice_number, amount)
    return f"rcpt-{invoice_number.lower()}"
