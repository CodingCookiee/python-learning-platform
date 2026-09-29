import json

import solution
from plp import captured_logs, hidden, test
from solution import run_tool


def error_of(content):
    parsed = json.loads(content)
    assert isinstance(parsed, dict) and "error" in parsed, f"Expected an error object, got {content}"
    return parsed["error"]


@test("Wrong argument names: say what the tool takes")
def _():
    assert error_of(run_tool("get_contacts", {"company": "Harbour Dental"})) == (
        "get_contacts takes: company_id, limit. You passed: company."
    )


@test("An unknown tool lists the real ones")
def _():
    assert error_of(run_tool("get_deals", {"company_id": "C-301"})) == (
        "Unknown tool: get_deals. Available tools: find_company, get_contacts."
    )


@test("Not found: the tool's own advice gets through")
def _():
    assert error_of(run_tool("find_company", {"name": "Harbor Dentl"})) == (
        "No company matching 'Harbor Dentl'. Check the spelling, or search with a shorter name."
    )
    assert error_of(run_tool("get_contacts", {"company_id": "Harbour Dental"})) == (
        "No company with id Harbour Dental. Get an id from find_company first."
    )


@test("CRM down: don't retry, and don't leak the internal host")
def _():
    solution.CRM["up"] = False
    try:
        with captured_logs("research_agent") as logs:
            content = run_tool("get_contacts", {"company_id": "C-301"})
    finally:
        solution.CRM["up"] = True
    assert error_of(content) == (
        "get_contacts is unavailable right now. Don't retry it; continue with what you have, "
        "or finish and say what's missing."
    )
    assert "crm-db-2" not in content
    assert any("crm-db-2" in message for message in logs.messages), "Log the real error for the team"


@test("Successful calls return the result as JSON")
def _():
    assert json.loads(run_tool("find_company", {"name": " Harbour Dental "})) == {"company_id": "C-301"}
    assert json.loads(run_tool("get_contacts", {"company_id": "C-301", "limit": 1})) == [
        {"name": "Priya Shah", "role": "Practice manager"}]


@hidden("A bad call never runs the tool")
def _():
    ran = []
    solution.REGISTRY["get_contacts"] = lambda company_id, limit=10: ran.append(company_id) or []
    try:
        content = run_tool("get_contacts", {"company_id": "C-301", "limt": 3})
    finally:
        solution.REGISTRY["get_contacts"] = solution.get_contacts
    assert ran == []
    assert error_of(content) == "get_contacts takes: company_id, limit. You passed: company_id, limt."


@hidden("Any other failure gets the generic message, and is logged")
def _():
    def broken(name):
        raise ZeroDivisionError("division by zero in scoring.py line 88")

    solution.REGISTRY["find_company"] = broken
    try:
        with captured_logs("research_agent") as logs:
            content = run_tool("find_company", {"name": "Kiln & Co"})
    finally:
        solution.REGISTRY["find_company"] = solution.find_company
    assert error_of(content) == "find_company failed unexpectedly. Don't retry it with the same arguments."
    assert "scoring.py" not in content
    assert logs.levels == ["WARNING"]
