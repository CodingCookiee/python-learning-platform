from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import FastAPI, Path, Query

RATES_BY_FLOOR = {1: 90, 2: 130, 3: 240}
EXTRAS_PER_NIGHT = {"breakfast": 15, "parking": 12}
EXTRAS_ONCE = {"late-checkout": 30}

type Extra = Literal["breakfast", "parking", "late-checkout"]

app = FastAPI()


@app.get("/rooms/{room_number}/quote")
def quote_stay(
    room_number: Annotated[int, Path(ge=100, le=399)],
    check_in: date,
    nights: Annotated[int, Query(ge=1, le=14)] = 1,
    extra: Annotated[list[Extra], Query()] = [],
):
    extras = sorted(set(extra))
    total = RATES_BY_FLOOR[room_number // 100] * nights
    total += sum(EXTRAS_PER_NIGHT.get(name, 0) * nights + EXTRAS_ONCE.get(name, 0) for name in extras)
    return {
        "room_number": room_number,
        "check_in": check_in,
        "check_out": check_in + timedelta(days=nights),
        "nights": nights,
        "extras": extras,
        "total": total,
    }
