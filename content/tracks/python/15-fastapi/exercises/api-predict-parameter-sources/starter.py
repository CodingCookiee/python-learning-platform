import asyncio

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Line(BaseModel):
    sku: str
    quantity: int = 1


@app.post("/carts/{cart_id}/lines")
def add_line(cart_id: str, line: Line, gift: bool = False):
    return {"cart": cart_id, "sku": line.sku, "quantity": line.quantity, "gift": gift}


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        attempts = [
            ("/carts/c7/lines", {"sku": "MUG-01"}),
            ("/carts/c7/lines?gift=yes", {"sku": "MUG-01", "quantity": "2"}),
            ("/carts/c7/lines", {"sku": "MUG-01", "gift": True}),
            ("/carts/c7/lines?sku=MUG-01", None),
            ("/carts/c8/lines", {"sku": "LAMP-02", "quantity": 2.5}),
        ]
        for path, body in attempts:
            response = await client.post(path, json=body)
            data = response.json()
            if response.status_code == 200:
                print(response.status_code, data["cart"], data["sku"], data["quantity"], data["gift"])
            else:
                print(response.status_code, [problem["loc"] for problem in data["detail"]])


asyncio.run(main())
