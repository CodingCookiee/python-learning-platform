from fastapi import FastAPI

app = FastAPI()


@app.get("/rooms/{room_number}")
def get_room(room_number: int):
    return {"room_number": room_number, "floor": room_number // 100}
