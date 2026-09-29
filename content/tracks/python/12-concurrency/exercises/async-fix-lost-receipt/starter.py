import asyncio


async def checkout(order, payments, mailer):
    """Charge the order, email the receipt, and return the receipt."""
    receipt = await payments.charge(order["id"], order["total"])
    asyncio.create_task(mailer.send(order["email"], receipt))
    return receipt
