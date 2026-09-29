from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

app = FastAPI()
accounts: list[dict] = []
outbox: list[dict] = []


class Signup(BaseModel):
    email: str
    name: str


def send_welcome_email(email: str, name: str) -> None:
    """Talks to the mail server: slow, and it refuses some addresses."""
    if email.endswith("@bounce.example"):
        raise ConnectionError(f"Mail server refused {email}")
    outbox.append({"to": email, "subject": f"Welcome to the job board, {name}"})


@app.post("/signups", status_code=201)
def sign_up(signup: Signup):
    accounts.append(signup.model_dump())
    send_welcome_email(signup.email, signup.name)
    return {"email": signup.email, "status": "active"}
