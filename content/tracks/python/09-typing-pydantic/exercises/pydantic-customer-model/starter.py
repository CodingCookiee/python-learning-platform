from pydantic import BaseModel, Field


class Customer(BaseModel):
    email: str
    # name, marketing_opt_in, loyalty_points
