import asyncio

import httpx
from fastapi import FastAPI, Request

app = FastAPI()
log = []


@app.middleware("http")
async def timing(request: Request, call_next):
    log.append("timing in")
    response = await call_next(request)
    log.append("timing out")
    return response


@app.middleware("http")
async def request_id(request: Request, call_next):
    log.append("request id in")
    response = await call_next(request)
    response.headers["X-Request-ID"] = "req-1"
    log.append("request id out")
    return response


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: str):
    log.append("endpoint")
    return {"booking_id": booking_id}


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for path in ["/bookings/B-1", "/rooms"]:
            log.clear()
            response = await client.get(path)
            print(path, response.status_code, response.headers.get("x-request-id"))
            print(log)


asyncio.run(main())
