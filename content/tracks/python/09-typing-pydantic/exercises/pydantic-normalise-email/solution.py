from pydantic import BaseModel, Field, field_validator


class Signup(BaseModel):
    email: str
    name: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        value = value.strip().lower()
        local, at, domain = value.partition("@")
        if not local or not at or "." not in domain:
            raise ValueError("not an email address")
        return value
