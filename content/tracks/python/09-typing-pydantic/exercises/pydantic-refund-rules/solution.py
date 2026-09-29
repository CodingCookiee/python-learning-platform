from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator


class RefundRequest(BaseModel):
    order_id: str
    paid_cents: int = Field(gt=0)
    refund_cents: int = Field(gt=0)
    reason: Literal["damaged", "late", "unwanted", "other"]
    note: str | None = None

    @model_validator(mode="after")
    def check_rules(self) -> Self:
        if self.refund_cents > self.paid_cents:
            raise ValueError("refund can't exceed the amount paid")
        if self.reason == "other" and not (self.note and self.note.strip()):
            raise ValueError("a refund for another reason needs a note")
        return self
