from typing import Literal, Optional

from plp import hidden, raises, test
from solution import tool_from_function


def find_slots(practitioner: str, day: str, duration_minutes: int = 30,
               kind: Literal["in_person", "video"] = "in_person") -> list[str]:
    """Find free appointment slots for a practitioner on a given day."""
    return []


def send_reminders(patient_emails: list[str], include_map: bool, note: str | None = None) -> int:
    """Email appointment reminders.

    Returns how many were sent.
    """
    return 0


def price_quote(sessions: int, discount: Optional[float] = None, block_booking: bool = False) -> float:
    """Quote a price for a course of sessions."""
    return 0.0


def cancel(appointment_id) -> None:
    """Cancel an appointment."""


def tag_patient(patient_id: str, tags: dict) -> None:
    """Add tags to a patient record."""


def undocumented(day: str) -> list[str]:
    return []


@test("Builds the example's tool")
def _():
    assert tool_from_function(find_slots) == {
        "name": "find_slots",
        "description": "Find free appointment slots for a practitioner on a given day.",
        "parameters": {
            "type": "object",
            "properties": {
                "practitioner": {"type": "string"},
                "day": {"type": "string"},
                "duration_minutes": {"type": "integer"},
                "kind": {"type": "string", "enum": ["in_person", "video"]},
            },
            "required": ["practitioner", "day"],
        },
    }


@test("Maps lists, booleans and optional values")
def _():
    properties = tool_from_function(send_reminders)["parameters"]["properties"]
    assert properties == {
        "patient_emails": {"type": "array", "items": {"type": "string"}},
        "include_map": {"type": "boolean"},
        "note": {"anyOf": [{"type": "string"}, {"type": "null"}]},
    }


@test("Keeps the whole docstring, cleaned up by inspect.getdoc")
def _():
    assert tool_from_function(send_reminders)["description"] == "Email appointment reminders.\n\nReturns how many were sent."


@test("Optional[X] works like X | None, and floats are numbers")
def _():
    tool = tool_from_function(price_quote)
    assert tool["parameters"]["properties"]["discount"] == {"anyOf": [{"type": "number"}, {"type": "null"}]}
    assert tool["parameters"]["properties"]["block_booking"] == {"type": "boolean"}
    assert tool["parameters"]["required"] == ["sessions"]


@test("Refuses a parameter with no type hint, naming it")
def _():
    raises(TypeError, tool_from_function, cancel, match="appointment_id")


@hidden("Refuses types it can't describe, and functions with no docstring")
def _():
    raises(TypeError, tool_from_function, tag_patient, match="tags")
    raises(ValueError, tool_from_function, undocumented)


@hidden("Handles nested lists and a tool with no parameters")
def _():
    def weekly_grid(rows: list[list[int]]) -> None:
        """Show a grid of slot counts."""

    def opening_hours() -> str:
        """Today's opening hours."""
        return "9-5"

    assert tool_from_function(weekly_grid)["parameters"]["properties"]["rows"] == {
        "type": "array", "items": {"type": "array", "items": {"type": "integer"}},
    }
    assert tool_from_function(opening_hours)["parameters"] == {"type": "object", "properties": {}, "required": []}
