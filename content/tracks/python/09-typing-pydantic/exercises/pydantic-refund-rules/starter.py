from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator


class RefundRequest(BaseModel):
    order_id: str
    # paid_cents, refund_cents, reason, note, and the two rules
