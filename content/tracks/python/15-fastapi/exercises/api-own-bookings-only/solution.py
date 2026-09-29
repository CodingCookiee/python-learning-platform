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


type Account = Annotated[dict, Depends(current_account)]


def visible(account: dict, booking: dict) -> bool:
    return account["role"] == "staff" or booking["customer_id"] == account["customer_id"]


def find_booking(account: dict, booking_id: str) -> dict:
    booking = bookings.get(booking_id)
    if booking is None or not visible(account, booking):
        raise HTTPException(404, f"Booking {booking_id} not found")
    return booking


@app.get("/bookings")
def list_bookings(account: Account):
    return [booking for booking in bookings.values() if visible(account, booking)]


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: str, account: Account):
    return find_booking(account, booking_id)


@app.delete("/bookings/{booking_id}", status_code=204)
def delete_booking(booking_id: str, account: Account):
    if account["role"] != "staff":
        raise HTTPException(403, "Only staff can delete bookings")
    find_booking(account, booking_id)
    del bookings[booking_id]
