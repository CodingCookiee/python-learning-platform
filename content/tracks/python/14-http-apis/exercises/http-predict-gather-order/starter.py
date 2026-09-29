import asyncio

import httpx

DELAY = {"MUG-STN": 0.3, "ETH-1KG": 0.1, "V60-100": 0.2}
finished = []


async def warehouse(request):
    sku = request.url.path.rsplit("/", 1)[-1]
    await asyncio.sleep(DELAY[sku])
    finished.append(sku)
    return httpx.Response(200, json={"sku": sku, "available": len(finished)})


async def main():
    skus = ["MUG-STN", "ETH-1KG", "V60-100"]
    transport = httpx.MockTransport(warehouse)
    async with httpx.AsyncClient(transport=transport, base_url="https://api.warehouse.example", timeout=10) as client:
        responses = await asyncio.gather(*(client.get(f"/v1/stock/{sku}") for sku in skus))
        print(finished)
        print([response.json()["sku"] for response in responses])
        print([response.json()["available"] for response in responses])

        finished.clear()
        for sku in skus:
            await client.get(f"/v1/stock/{sku}")
        print(finished)


asyncio.run(main())
