import json
from datetime import date

from plp import captured_logs, hidden, test
from solution import ToolError, agent_tool

NOTES = {"C-301": [{"date": "2026-09-12", "text": "Wants SSO before renewal."},
                   {"date": "2026-08-30", "text": "Asked about annual billing."}]}
RAN = []
NEWS = "Harbour Dental opened a second clinic in Leeds in August 2026, and plans a third."


def get_account_notes(account_id: str, limit: int = 5):
    """Recent call notes for one account, newest first."""
    RAN.append(account_id)
    if account_id not in NOTES:
        raise ToolError(f"No account {account_id}. Use find_company to get an id.")
    return NOTES[account_id][:limit]


def notes_tool():
    return agent_tool(max_chars=2000)(get_account_notes)


@test("Runs the example, and explains bad arguments")
def _():
    tool = notes_tool()
    assert tool(account_id="C-301", limit=1) == '[{"date": "2026-09-12", "text": "Wants SSO before renewal."}]'
    assert json.loads(tool(account="C-301")) == {
        "error": "get_account_notes takes account_id, limit (optional). You passed: account."}


@test("Bad arguments never reach the function")
def _():
    tool = notes_tool()
    RAN.clear()
    tool(account_id="C-301", limt=2)
    tool()
    assert RAN == []


@test("A ToolError's message goes to the model")
def _():
    assert json.loads(notes_tool()(account_id="C-999")) == {"error": "No account C-999. Use find_company to get an id."}


@test("Other exceptions are hidden from the model and logged")
def _():
    def score_lead(company_id):
        raise KeyError("scoring_weights_v3")

    tool = agent_tool()(score_lead)
    with captured_logs("research_agent") as logs:
        content = tool(company_id="C-301")
    assert json.loads(content) == {"error": "score_lead failed unexpectedly. Don't retry it with the same arguments."}
    assert "scoring_weights_v3" not in content
    assert logs.levels == ["WARNING"] and "score_lead" in logs.messages[0]


@test("Keeps the function's name and docstring")
def _():
    tool = notes_tool()
    assert tool.__name__ == "get_account_notes"
    assert tool.__doc__ == "Recent call notes for one account, newest first."


@hidden("Strings pass through, other values become JSON, and everything is clipped")
def _():
    def read_page(url):
        return NEWS

    def last_contacted(company_id):
        return {"company_id": company_id, "on": date(2026, 9, 12)}

    assert agent_tool(max_chars=200)(read_page)(url="https://harbour.example/news") == NEWS
    assert agent_tool(max_chars=40)(read_page)(url="https://harbour.example/news") == (
        NEWS[:40] + f"\n[cut: showing 40 of {len(NEWS)} characters. Ask for less: a narrower query or the next page.]")
    assert json.loads(agent_tool()(last_contacted)(company_id="C-301")) == {"company_id": "C-301", "on": "2026-09-12"}
