import solution
from plp import defined_names, hidden, source_avoids, test
from solution import REGISTRY, STAGES, TOOLS


def tool(name):
    matches = [t for t in TOOLS if t["name"] == name]
    assert matches, f"TOOLS has no tool named {name!r}"
    return matches[0]


@test("The three tools from the example work")
def _():
    assert [t["name"] for t in TOOLS] == ["find_contact", "add_note", "set_deal_stage"]
    assert REGISTRY["find_contact"](email="ada@northwind.example") == {"contact_id": "C-301", "name": "Ada Park"}
    assert REGISTRY["set_deal_stage"](deal_id="D-77", stage="won") == {"deal_id": "D-77", "stage": "won"}


@test("Each tool has typed, described, required parameters")
def _():
    expected = {"find_contact": ["email"], "add_note": ["contact_id", "text"], "set_deal_stage": ["deal_id", "stage"]}
    for name, params in expected.items():
        schema = tool(name)["parameters"]
        assert list(schema["properties"]) == params, f"{name} parameters"
        assert schema.get("required") == params, f"{name} should require {params}"
        undescribed = [p for p, s in schema["properties"].items() if not s.get("description")]
        assert undescribed == [], f"{name}: these parameters have no description: {undescribed}"


@test("The stage is an enum of STAGES")
def _():
    stage = tool("set_deal_stage")["parameters"]["properties"]["stage"]
    assert stage.get("type") == "string"
    assert stage.get("enum") == list(STAGES)


@test("The god tool is gone, and nothing parses JSON strings any more")
def _():
    assert "crm" not in defined_names("function"), "Remove the crm() function"
    assert "crm" not in REGISTRY
    assert source_avoids(call="json.loads"), "The tools take typed arguments, so nothing needs json.loads"


@hidden("Keeps each action's behaviour")
def _():
    solution.NOTES.clear()
    solution.DEALS["D-77"] = "proposal"
    assert REGISTRY["find_contact"](email=" ADA@northwind.example ") == {"contact_id": "C-301", "name": "Ada Park"}
    assert REGISTRY["find_contact"](email="bob@example.com") == {"error": "No contact with email bob@example.com"}
    assert REGISTRY["add_note"](contact_id="C-301", text="Wants a demo") == {"contact_id": "C-301", "notes": 1}
    assert REGISTRY["add_note"](contact_id="C-301", text="Budget approved") == {"contact_id": "C-301", "notes": 2}
    assert REGISTRY["set_deal_stage"](deal_id="D-99", stage="won") == {"error": "No deal D-99"}
    assert REGISTRY["set_deal_stage"](deal_id="D-77", stage="Won") == {"error": "Unknown stage Won"}
    assert solution.DEALS["D-77"] == "proposal"
