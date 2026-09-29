from pydantic import BaseModel, Field


class Customer(BaseModel):
    email: str
    name: str = Field(min_length=1)
    marketing_opt_in: bool = False
    loyalty_points: int = Field(default=0, ge=0)
