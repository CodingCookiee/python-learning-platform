from fastapi import FastAPI

ROOMS = [
    {"number": 101, "kind": "single", "rate": 90},
    {"number": 102, "kind": "double", "rate": 130},
    {"number": 204, "kind": "suite", "rate": 240},
]

app = FastAPI()


@app.get("/rooms")
def list_rooms():
    return ROOMS


@app.get("/rooms/{room_number}")
def get_room(room_number):
    for room in ROOMS:
        if room["number"] == room_number:
            return room
