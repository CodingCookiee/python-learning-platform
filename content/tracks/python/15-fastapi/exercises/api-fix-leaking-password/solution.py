import hashlib

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()
recruiters: dict[int, dict] = {}


class RecruiterSignup(BaseModel):
    email: str
    name: str = Field(min_length=1)
    company: str
    password: str = Field(min_length=12)


class RecruiterRead(BaseModel):
    id: int
    email: str
    name: str
    company: str
    verified: bool


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


@app.post("/recruiters", status_code=201, response_model=RecruiterRead)
def sign_up(signup: RecruiterSignup):
    recruiter = {
        "id": len(recruiters) + 1,
        "email": signup.email,
        "name": signup.name,
        "company": signup.company,
        "password_hash": hash_password(signup.password),
        "verified": False,
    }
    recruiters[recruiter["id"]] = recruiter
    return recruiter


@app.get("/recruiters/{recruiter_id}", response_model=RecruiterRead)
def get_recruiter(recruiter_id: int):
    return recruiters[recruiter_id]


@app.get("/recruiters", response_model=list[RecruiterRead])
def list_recruiters():
    return list(recruiters.values())
