import traceback


def sync_orders(orders, shop):
    """Upload each order to the shop's API and return how many were uploaded."""
    print("DEBUG: syncing", len(orders), "orders")
    synced = 0
    for order in orders:
        try:
            shop.upload(order)
        except ConnectionError:
            print("ERROR: could not upload order", order["id"])
            traceback.print_exc()
            continue
        synced += 1
    if synced == len(orders):
        print("INFO: synced all", synced, "orders")
    else:
        print("WARNING: synced", synced, "of", len(orders), "orders")
    return synced
