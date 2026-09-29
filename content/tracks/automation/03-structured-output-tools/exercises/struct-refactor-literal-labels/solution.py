from typing import Literal

from pydantic import BaseModel, Field, field_validator


class LeadLabel(BaseModel):
    label: Literal["hot", "warm", "cold"]
    confidence: float = Field(ge=0, le=1)

    @field_validator("label", mode="before")
    @classmethod
    def tidy_label(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


def parse_label(data: dict) -> LeadLabel:
    """Check the lead scorer's reply and return the label and confidence."""
    return LeadLabel.model_validate(data)
