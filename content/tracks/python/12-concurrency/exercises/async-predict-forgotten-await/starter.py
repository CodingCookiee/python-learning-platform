import asyncio


async def in_stock(sku):
    await asyncio.sleep(0.01)
    return sku != "MUG-STN"


async def main():
    basket = ["ETH-1KG", "MUG-STN"]
    checks = [in_stock(sku) for sku in basket]
    print(type(checks[0]).__name__)
    if all(checks):
        print("everything is in stock?")
    results = [await check for check in checks]
    print(results, all(results))
    missing = [sku for sku in basket if not in_stock(sku)]
    print("missing:", missing)


asyncio.run(main())
