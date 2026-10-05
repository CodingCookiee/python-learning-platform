"""Charging invoices. Library code: it logs, and leaves configuring logging to the application."""
import logging

logger = logging.getLogger(__name__)


def charge(invoice_id, amount_pence):
    logger.debug("charging %s for %dp", invoice_id, amount_pence)
    if amount_pence <= 0:
        logger.warning("refused %s: the amount must be positive", invoice_id)
        return False
    logger.info("charged %s for %dp", invoice_id, amount_pence)
    return True
