import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()
log = []


def get_settings():
    log.append("settings")
    return {"currency": "EUR"}


def get_db(settings: Annotated[dict, Depends(get_settings)]):
    log.append("open db")
    yield "db"
    log.append("close db")


def current_user(db: Annotated[str, Depends(get_db)]):
    log.append("user")
    return "ada"


@app.get("/invoices")
def list_invoices(
    user: Annotated[str, Depends(current_user)],
    db: Annotated[str, Depends(get_db)],
    settings: Annotated[dict, Depends(get_settings)],
):
    log.append("endpoint")
    return []


@app.get("/invoices/{number}")
def get_invoice(number: str, user: Annotated[str, Depends(current_user)]):
    log.append("endpoint")
    raise HTTPException(404, "No such invoice")


@app.get("/health")
def health():
    log.append("endpoint")
    return {"status": "ok"}


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for path in ["/invoices", "/health", "/invoices/INV-0099"]:
            log.clear()
            response = await client.get(path)
            print(path, response.status_code, log)


asyncio.run(main())
