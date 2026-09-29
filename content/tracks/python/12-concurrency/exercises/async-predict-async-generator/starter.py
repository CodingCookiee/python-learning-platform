import asyncio
from contextlib import aclosing


async def ticker(symbols):
    print("subscribe")
    try:
        for symbol in symbols:
            await asyncio.sleep(0.01)
            print(f"  quote {symbol}")
            yield symbol
    finally:
        print("unsubscribe")


async def main():
    async with aclosing(ticker(["AAPL", "MSFT", "NVDA", "TSLA"])) as quotes:
        async for symbol in quotes:
            print("got", symbol)
            if symbol == "MSFT":
                break
            print("waiting for more")
    print("done")
    coins = [symbol.lower() async for symbol in ticker(["BTC"])]
    print(coins)


asyncio.run(main())
