def charge(gateway, card, amount, retry_queue):
    """Charge a card through the gateway and return its receipt.

    If the gateway can't be reached, queue (card, amount) for a retry and pass the error on.
    """
    try:
        return gateway.charge(card, amount)
    except Exception:
        retry_queue.append((card, amount))
        raise Exception("charge failed")
