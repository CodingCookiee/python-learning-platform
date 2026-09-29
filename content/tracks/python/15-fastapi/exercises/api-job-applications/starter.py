from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

type Role = Literal["backend-engineer", "data-analyst", "tour-guide"]

app = FastAPI()
applications: dict[int, dict] = {}


# ApplicationCreate and ApplicationRead models


@app.post("/applications")
def apply(application: dict):
    ...


@app.get("/applications")
def list_applications():
    ...


@app.get("/applications/{application_id}")
def get_application(application_id: int):
    ...
