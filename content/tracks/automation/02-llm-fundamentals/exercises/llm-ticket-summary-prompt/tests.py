from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import SUMMARY_SYSTEM, summarise_ticket

TICKET = "Order #1042 arrived with a cracked screen. I'd like a replacement."
SUMMARY = "Cracked screen on order #1042; customer wants a replacement."


@test("Returns the summary, like the example")
def _():
    llm = ScriptedLLM([SUMMARY])
    assert summarise_ticket(llm, TICKET) == SUMMARY


@test("Sends the rules as the system prompt")
def _():
    llm = ScriptedLLM([SUMMARY])
    summarise_ticket(llm, TICKET)
    assert llm.calls[0]["system"] == SUMMARY_SYSTEM


@test("Sends the ticket alone, between <ticket> tags")
def _():
    llm = ScriptedLLM([SUMMARY])
    summarise_ticket(llm, TICKET)
    assert llm.calls[0]["messages"] == [{"role": "user", "content": f"<ticket>\n{TICKET}\n</ticket>"}]


@test("Uses temperature 0 and max_tokens 100")
def _():
    llm = ScriptedLLM([SUMMARY])
    summarise_ticket(llm, TICKET)
    assert (llm.calls[0]["temperature"], llm.calls[0]["max_tokens"]) == (0, 100)


@hidden("Strips whitespace around the reply, and makes one call")
def _():
    llm = ScriptedLLM(["\n  Brake cable snapped on a new bike; customer wants a repair.  \n"])
    assert summarise_ticket(llm, "The brake cable snapped on my new bike.") == "Brake cable snapped on a new bike; customer wants a repair."
    assert len(llm.calls) == 1
