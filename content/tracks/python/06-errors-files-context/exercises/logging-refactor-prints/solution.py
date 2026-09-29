import logging

log = logging.getLogger(__name__)


def sync_orders(orders, shop):
    """Upload each order to the shop's API and return how many were uploaded."""
    log.debug("syncing %d orders", len(orders))
    synced = 0
    for order in orders:
        try:
            shop.upload(order)
        except ConnectionError:
            log.exception("could not upload order %s", order["id"])
            continue
        synced += 1
    if synced == len(orders):
        log.info("synced all %d orders", synced)
    else:
        log.warning("synced %d of %d orders", synced, len(orders))
    return synced
