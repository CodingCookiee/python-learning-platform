async def checkout(order, payments, mailer):
    """Charge the order, email the receipt, and return the receipt."""
    receipt = await payments.charge(order["id"], order["total"])
    await mailer.send(order["email"], receipt)
    return receipt
