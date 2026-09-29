import re
from datetime import date, timedelta

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import WRITER_SYSTEM, Action, chase_invoice

TODAY = date(2026, 9, 29)
EMAIL = "Hi Harbour Dental team, invoice INV-2291 for 1,450.00 is now 18 days overdue..."


def invoice(days_overdue, number="INV-2291", client="Harbour Dental", amount="1,450.00"):
    return {"number": number, "client": client, "amount": amount, "due": TODAY - timedelta(days=days_overdue)}


@test("An invoice 18 days overdue gets a firm email")
def _():
    llm = ScriptedLLM([EMAIL + "\n"])
    assert chase_invoice(llm, invoice(18), today=TODAY) == Action("email", "firm", EMAIL)
    assert len(llm.calls) == 1


@test("The one call carries the invoice facts and the tone, inside <invoice> tags")
def _():
    llm = ScriptedLLM([EMAIL])
    chase_invoice(llm, invoice(18), today=TODAY)
    call = llm.calls[0]
    assert call["system"] == WRITER_SYSTEM
    assert call["max_tokens"] == 300
    assert len(call["messages"]) == 1 and call["messages"][0]["role"] == "user"
    tagged = re.search(r"<invoice>(.*)</invoice>", call["messages"][0]["content"], re.S)
    assert tagged, "Put the invoice facts between <invoice> and </invoice>"
    for fact in ["INV-2291", "Harbour Dental", "1,450.00", "18 days overdue", "firm"]:
        assert fact in tagged.group(1), f"The <invoice> block should mention {fact!r}"


@test("3 to 13 days is friendly, 14 to 29 is firm")
def _():
    tones = {}
    for days in [3, 13, 14, 29]:
        llm = ScriptedLLM(["Reminder text"])
        tones[days] = chase_invoice(llm, invoice(days), today=TODAY).tone
    assert tones == {3: "friendly", 13: "friendly", 14: "firm", 29: "firm"}


@test("Too early to chase: wait, without calling the model")
def _():
    for days in [-5, 0, 2]:
        assert chase_invoice(ScriptedLLM([]), invoice(days), today=TODAY) == Action("wait")


@test("30 days or more: escalate to a person, without calling the model")
def _():
    assert chase_invoice(ScriptedLLM([]), invoice(30), today=TODAY) == Action("escalate")
    assert chase_invoice(ScriptedLLM([]), invoice(95), today=TODAY) == Action("escalate")


@hidden("Uses each invoice's own details")
def _():
    llm = ScriptedLLM(["  Hello Kiln & Co, a quick reminder about INV-3310.  "])
    result = chase_invoice(llm, invoice(5, "INV-3310", "Kiln & Co", "220.50"), today=TODAY)
    assert result == Action("email", "friendly", "Hello Kiln & Co, a quick reminder about INV-3310.")
    content = llm.calls[0]["messages"][0]["content"]
    assert "INV-3310" in content and "Kiln & Co" in content and "220.50" in content and "5 days overdue" in content
