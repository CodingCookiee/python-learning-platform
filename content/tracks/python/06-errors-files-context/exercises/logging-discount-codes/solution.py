import logging
from decimal import Decimal

log = logging.getLogger(__name__)


def apply_discount(total, code, codes):
    """The total after applying a discount code; codes maps each code to a percentage off."""
    if not code:
        return total
    key = code.upper()
    percent = codes.get(key)
    if percent is None:
        log.warning("unknown discount code %r", code)
        return total
    discounted = (total * (100 - percent) / 100).quantize(Decimal("0.01"))
    log.info("applied %s: %s -> %s", key, total, discounted)
    return discounted
