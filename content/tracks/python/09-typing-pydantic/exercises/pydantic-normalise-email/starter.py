from pydantic import BaseModel, Field, field_validator


class Signup(BaseModel):
    email: str
    name: str = Field(min_length=1)
