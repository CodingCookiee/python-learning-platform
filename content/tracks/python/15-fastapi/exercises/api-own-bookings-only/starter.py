from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

ACCOUNTS = {
    "key_ada_3f9e": {"role": "customer", "customer_id": "cus_ada"},
    "key_grace_81c2": {"role": "customer", "customer_id": "cus_grace"},
    "key_desk_0d7a": {"role": "staff", "customer_id": None},
}

app = FastAPI()
bookings: dict[str, dict] = {
    "B-1": {"id": "B-1", "customer_id": "cus_ada", "tour": "Harbour kayak"},
    "B-2": {"id": "B-2", "customer_id": "cus_grace", "tour": "Island ferry"},
    "B-3": {"id": "B-3", "customer_id": "cus_ada", "tour": "Lighthouse walk"},
}


def current_account(x_api_key: Annotated[str | None, Header()] = None) -> dict:
    if x_api_key not in ACCOUNTS:
        raise HTTPException(401, "Missing or invalid API key", headers={"WWW-Authenticate": "ApiKey"})
    return ACCOUNTS[x_api_key]


@app.get("/bookings")
def list_bookings(account: Annotated[dict, Depends(current_account)]):
    return list(bookings.values())


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: str, account: Annotated[dict, Depends(current_account)]):
    return bookings[booking_id]


@app.delete("/bookings/{booking_id}", status_code=204)
def delete_booking(booking_id: str, account: Annotated[dict, Depends(current_account)]):
    del bookings[booking_id]
