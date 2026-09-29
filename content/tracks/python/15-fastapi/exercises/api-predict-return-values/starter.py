import asyncio

import httpx
from fastapi import FastAPI

app = FastAPI()


@app.get("/menu")
def menu():
    return [("espresso", 2.5), ("flat white", 3.4)]


@app.get("/menu/{item_id}")
def menu_item(item_id: int):
    return {"item_id": item_id, "available": item_id < 10}


@app.get("/greeting")
def greeting():
    return "Welcome"


@app.get("/specials")
def specials():
    return None


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for path in ["/menu", "/menu/3", "/greeting", "/specials", "/menu/latte"]:
            response = await client.get(path)
            if response.status_code == 200:
                print(path, response.text)
            else:
                print(path, response.status_code)


asyncio.run(main())
