import json
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from plp import captured_logs, hidden, test
from plp_fakes import McpHarness
from solution import Tool, ToolError, ToolServer

FREE = {("Patel", date(2026, 10, 1)): ["14:30", "16:00"]}
BOOKINGS = {"P-3301": {"practitioner": "Patel", "day": "2026-10-01", "time": "09:00"}}


class FindSlots(BaseModel):
    """Find free appointment slots with one practitioner on one day."""

    model_config = ConfigDict(extra="forbid")
    practitioner: str = Field(description="Surname, e.g. Patel")
    day: date


class Slots(BaseModel):
    practitioner: str
    day: date
    times: list[str]


class NextAppointment(BaseModel):
    """The next booked appointment for a patient."""

    patient_id: str = Field(pattern=r"^P-\d{4}$")


class Appointment(BaseModel):
    practitioner: str
    day: date
    time: str


def find_slots(args):
    if args.practitioner not in {"Patel", "Okafor"}:
        raise ToolError(f"No practitioner called {args.practitioner}")
    return Slots(practitioner=args.practitioner, day=args.day, times=FREE.get((args.practitioner, args.day), []))


def next_appointment(args):
    if args.patient_id == "P-0000":
        return {"practitioner": "Patel", "day": "next week"}         # a bug: wrong shape
    if args.patient_id not in BOOKINGS:
        raise ToolError(f"No upcoming appointment for {args.patient_id}")
    return BOOKINGS[args.patient_id]


TOOLS = [
    Tool("find_slots", "Find free slots", FindSlots, Slots, find_slots),
    Tool("next_appointment", "Next appointment", NextAppointment, Appointment, next_appointment),
]


def connected():
    client = McpHarness(ToolServer("leith-physio", "3.0.0", TOOLS).handle)
    client.initialize()
    return client


@test("Returns free slots as structured content")
def _():
    assert connected().call_tool("find_slots", {"practitioner": "Patel", "day": "2026-10-01"})["structuredContent"] == {
        "practitioner": "Patel", "day": "2026-10-01", "times": ["14:30", "16:00"]}


@test("The text block carries the same data as JSON, for text-only clients")
def _():
    result = connected().call_tool("next_appointment", {"patient_id": "P-3301"})
    assert result["isError"] is False
    assert len(result["content"]) == 1 and result["content"][0]["type"] == "text"
    assert json.loads(result["content"][0]["text"]) == result["structuredContent"] == {
        "practitioner": "Patel", "day": "2026-10-01", "time": "09:00"}


@test("initialize reports the server's name and the tools capability")
def _():
    info = McpHarness(ToolServer("leith-physio", "3.0.0", TOOLS).handle).initialize()
    assert info == {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                    "serverInfo": {"name": "leith-physio", "version": "3.0.0"}}


@test("tools/list has titles, descriptions and both schemas")
def _():
    tools = connected().list_tools()
    assert [(t["name"], t["title"]) for t in tools] == [("find_slots", "Find free slots"), ("next_appointment", "Next appointment")]
    first = tools[0]
    assert first["description"] == "Find free appointment slots with one practitioner on one day."
    assert first["inputSchema"]["required"] == ["practitioner", "day"]
    assert first["inputSchema"]["properties"]["day"]["format"] == "date"
    assert first["outputSchema"]["properties"]["times"]["type"] == "array"
    assert "title" not in first["inputSchema"] and "title" not in first["outputSchema"]


@test("Bad arguments and tool errors are isError results")
def _():
    client = connected()
    bad_day = client.call_tool("find_slots", {"practitioner": "Patel", "day": "Thursday"})
    assert bad_day["isError"] is True
    assert bad_day["content"][0]["text"].startswith("Invalid arguments: day: Input should be a valid date")
    assert client.call_tool("find_slots", {"practitioner": "Jones", "day": "2026-10-01"}) == {
        "content": [{"type": "text", "text": "No practitioner called Jones"}], "isError": True}


@hidden("Output that doesn't match the schema is the server's bug: logged, and reported without data")
def _():
    with captured_logs("leith_physio") as logs:
        result = connected().call_tool("next_appointment", {"patient_id": "P-0000"})
    assert result == {"content": [{"type": "text", "text": "next_appointment returned invalid output"}], "isError": True}
    assert logs.levels == ["ERROR"]
    assert "next_appointment" in logs.messages[0]


@hidden("Unknown tools are -32602, unknown methods -32601, notifications None")
def _():
    client = connected()
    assert client.request("tools/call", {"name": "book_slot", "arguments": {}})["error"] == {
        "code": -32602, "message": "Unknown tool: book_slot"}
    assert client.request("resources/list")["error"] == {"code": -32601, "message": "Method not found: resources/list"}
    assert ToolServer("x", "1", TOOLS).handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None


@hidden("Every problem is reported, and an empty day list is still valid output")
def _():
    client = connected()
    text = client.call_tool("find_slots", {"day": "2026-10-02", "room": 4})["content"][0]["text"]
    assert text == "Invalid arguments: practitioner: Field required; room: Extra inputs are not permitted"
    assert client.call_tool("find_slots", {"practitioner": "Okafor", "day": "2026-10-02"})["structuredContent"]["times"] == []
