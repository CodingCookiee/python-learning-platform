import json

from plp import hidden, raises, test
from plp_fakes import ScriptedLLM, tool_call
from solution import StepLimitExceeded, run_tools

SYSTEM = "You book appointments for Riverside Physio. Only book slots that find_slots returned."
TOOLS = [
    {"name": "find_slots", "description": "Find free slots for a practitioner on a day.",
     "parameters": {"type": "object", "properties": {"practitioner": {"type": "string"}, "day": {"type": "string"}},
                    "required": ["practitioner", "day"]}},
    {"name": "book_appointment", "description": "Book a free slot for a patient.",
     "parameters": {"type": "object", "properties": {"practitioner": {"type": "string"}, "start": {"type": "string"},
                                                     "patient_email": {"type": "string"}},
                    "required": ["practitioner", "start", "patient_email"]}},
]
BOOKINGS = []


def find_slots(practitioner, day):
    return [f"{day}T14:30", f"{day}T16:00"] if practitioner == "Patel" else []


def book_appointment(practitioner, start, patient_email):
    BOOKINGS.append((practitioner, start, patient_email))
    return {"booking_id": "BK-5521", "start": start}


REGISTRY = {"find_slots": find_slots, "book_appointment": book_appointment}
QUESTION = [{"role": "user", "content": "Book me the first Thursday slot with Dr Patel. ada@example.com"}]
ANSWER = "You're booked with Dr Patel on Thursday at 14:30. Your reference is BK-5521."


def script():
    return [
        tool_call("find_slots", practitioner="Patel", day="2026-10-01"),
        tool_call("book_appointment", practitioner="Patel", start="2026-10-01T14:30", patient_email="ada@example.com"),
        ANSWER,
    ]


@test("Books the example appointment in two tool steps")
def _():
    BOOKINGS.clear()
    llm = ScriptedLLM(script())
    assert run_tools(llm, QUESTION, TOOLS, REGISTRY, system=SYSTEM) == ANSWER
    assert BOOKINGS == [("Patel", "2026-10-01T14:30", "ada@example.com")]
    assert len(llm.calls) == 3


@test("Offers the tools and the system prompt on every call")
def _():
    llm = ScriptedLLM(script())
    run_tools(llm, QUESTION, TOOLS, REGISTRY, system=SYSTEM)
    assert [call["tools"] == TOOLS for call in llm.calls] == [True, True, True]
    assert [call["system"] for call in llm.calls] == [SYSTEM, SYSTEM, SYSTEM]


@test("Sends each tool's result back, linked to its call")
def _():
    llm = ScriptedLLM(script())
    run_tools(llm, QUESTION, TOOLS, REGISTRY, system=SYSTEM)
    history = llm.calls[2]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "tool", "assistant", "tool"]
    assert json.loads(history[2]["content"]) == ["2026-10-01T14:30", "2026-10-01T16:00"]
    assert history[2]["tool_call_id"] == history[1]["tool_calls"][0]["id"]
    assert json.loads(history[4]["content"]) == {"booking_id": "BK-5521", "start": "2026-10-01T14:30"}


@test("A direct answer takes one call")
def _():
    llm = ScriptedLLM(["We're open 8am to 7pm on weekdays."])
    assert run_tools(llm, [{"role": "user", "content": "When are you open?"}], TOOLS, REGISTRY) == "We're open 8am to 7pm on weekdays."
    assert len(llm.calls) == 1


@test("Stops at max_steps with StepLimitExceeded")
def _():
    llm = ScriptedLLM([tool_call("find_slots", practitioner="Patel", day=f"2026-10-0{n}") for n in range(1, 4)])
    raises(StepLimitExceeded, run_tools, llm, QUESTION, TOOLS, REGISTRY, max_steps=3)
    assert len(llm.calls) == 3


@hidden("Never changes the caller's messages")
def _():
    question = [dict(QUESTION[0])]
    run_tools(ScriptedLLM(script()), question, TOOLS, REGISTRY, system=SYSTEM)
    assert question == QUESTION


@hidden("Allows five steps by default")
def _():
    llm = ScriptedLLM([tool_call("find_slots", practitioner="Okafor", day="2026-10-01")] * 5)
    raises(StepLimitExceeded, run_tools, llm, QUESTION, TOOLS, REGISTRY)
    assert len(llm.calls) == 5
