from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

type Role = Literal["backend-engineer", "data-analyst", "tour-guide"]

app = FastAPI()
applications: dict[int, dict] = {}


class ApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    role: Role
    cover_letter: str = Field(max_length=2000)


class ApplicationRead(BaseModel):
    id: int
    name: str
    role: Role
    status: str


@app.post("/applications", status_code=201, response_model=ApplicationRead)
def apply(application: ApplicationCreate):
    new_id = len(applications) + 1
    applications[new_id] = {"id": new_id, **application.model_dump(), "status": "received"}
    return applications[new_id]


@app.get("/applications", response_model=list[ApplicationRead])
def list_applications(role: Role | None = None):
    return [stored for stored in applications.values() if role is None or stored["role"] == role]


@app.get("/applications/{application_id}", response_model=ApplicationRead)
def get_application(application_id: int):
    return applications[application_id]
