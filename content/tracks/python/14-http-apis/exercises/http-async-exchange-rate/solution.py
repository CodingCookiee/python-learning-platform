from decimal import Decimal


async def get_rate(client, base, quote):
    """The exchange rate from base to quote, as a Decimal."""
    response = await client.get("/v1/rates", params={"base": base, "quote": quote})
    response.raise_for_status()
    return Decimal(response.json()["rate"])
