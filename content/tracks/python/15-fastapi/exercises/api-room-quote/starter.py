from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import FastAPI, Path, Query

RATES_BY_FLOOR = {1: 90, 2: 130, 3: 240}
EXTRAS_PER_NIGHT = {"breakfast": 15, "parking": 12}
EXTRAS_ONCE = {"late-checkout": 30}

app = FastAPI()

# GET /rooms/{room_number}/quote?check_in=2026-10-01&nights=3&extra=breakfast
