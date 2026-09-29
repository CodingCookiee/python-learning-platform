from typing import Literal

from pydantic import BaseModel, Field

from plp import hidden, raises, test
from solution import tool_from_model


class BookAppointment(BaseModel):
    """Book an appointment slot for a patient. Only use a start time returned by find_slots."""

    practitioner: str = Field(description="Surname, e.g. Patel")
    start: str = Field(description="ISO datetime of a free slot, e.g. 2026-10-01T14:30")
    patient_email: str


class FindSlots(BaseModel):
    """Find free appointment slots for a practitioner on a given day."""

    practitioner: str
    day: str
    kind: Literal["in_person", "video"] = "in_person"


class Address(BaseModel):
    line1: str
    postcode: str


class UpdatePatientAddress(BaseModel):
    """Change the address on a patient's record.

    Use only when the patient has confirmed the new address.
    """

    patient_id: str
    address: Address


class NoDocs(BaseModel):
    day: str


@test("Builds the example's tool")
def _():
    tool = tool_from_model(BookAppointment)
    assert tool["name"] == "book_appointment"
    assert tool["description"] == "Book an appointment slot for a patient. Only use a start time returned by find_slots."
    assert tool["parameters"]["required"] == ["practitioner", "start", "patient_email"]
    assert tool["parameters"]["properties"]["start"]["description"] == "ISO datetime of a free slot, e.g. 2026-10-01T14:30"
    assert "title" not in tool["parameters"]


@test("Names tools in snake_case")
def _():
    assert tool_from_model(FindSlots)["name"] == "find_slots"
    assert tool_from_model(UpdatePatientAddress)["name"] == "update_patient_address"


@test("Removes only the top-level title and description")
def _():
    parameters = tool_from_model(UpdatePatientAddress)["parameters"]
    assert "description" not in parameters and "title" not in parameters
    assert parameters["properties"]["patient_id"] == {"title": "Patient Id", "type": "string"}
    assert parameters["type"] == "object"


@test("Keeps enums, defaults and nested models")
def _():
    kind = tool_from_model(FindSlots)["parameters"]["properties"]["kind"]
    assert kind["enum"] == ["in_person", "video"]
    assert kind["default"] == "in_person"
    parameters = tool_from_model(UpdatePatientAddress)["parameters"]
    assert parameters["$defs"]["Address"]["required"] == ["line1", "postcode"]
    assert parameters["properties"]["address"] == {"$ref": "#/$defs/Address"}


@hidden("Cleans up a multi-line docstring, and refuses a model without one")
def _():
    assert tool_from_model(UpdatePatientAddress)["description"] == (
        "Change the address on a patient's record.\n\nUse only when the patient has confirmed the new address."
    )
    raises(ValueError, tool_from_model, NoDocs)
