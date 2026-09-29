from plp import hidden, raises, test
from plp_fakes import ScriptedLLM
from solution import REPLY_TEMPLATE, draft_support_reply

TICKET = "My order #1042 is late. When will it come?"
POLICY = "Orders ship within 2 working days."
LONG = "We are so sorry that your order has not arrived yet, orders usually ship within two working days of purchase."
SHORT = "Sorry for the wait! Order #1042 ships within 2 working days."
FEEDBACK = "That reply is 20 words. Rewrite it in at most 12 words, keeping the same facts."


@test("Asks for a shorter reply once, like the example")
def _():
    llm = ScriptedLLM([LONG, SHORT])
    assert draft_support_reply(llm, TICKET, policy=POLICY, max_words=12) == SHORT
    assert llm.calls[1]["messages"] == [
        {"role": "user", "content": f"<ticket>\n{TICKET}\n</ticket>"},
        {"role": "assistant", "content": LONG},
        {"role": "user", "content": FEEDBACK},
    ]


@test("A reply within the limit is returned after one call")
def _():
    llm = ScriptedLLM([f"  {SHORT}\n"])
    assert draft_support_reply(llm, TICKET, policy=POLICY, max_words=12) == SHORT
    assert len(llm.calls) == 1


@test("Fills in the template and sends the ticket in tags")
def _():
    llm = ScriptedLLM([SHORT])
    draft_support_reply(llm, TICKET, policy=POLICY, max_words=40)
    call = llm.calls[0]
    assert call["system"] == REPLY_TEMPLATE.format(policy=POLICY, max_words=40)
    assert call["messages"] == [{"role": "user", "content": f"<ticket>\n{TICKET}\n</ticket>"}]
    assert (call["max_tokens"], call["temperature"]) == (300, 0.3)


@test("Gives up after the second attempt")
def _():
    llm = ScriptedLLM([LONG, LONG])
    raises(ValueError, draft_support_reply, llm, TICKET, policy=POLICY, max_words=12, match="20")
    assert len(llm.calls) == 2


@hidden("The retry keeps the same system prompt and settings, and uses 60 words by default")
def _():
    long_reply = " ".join(["word"] * 61)
    llm = ScriptedLLM([long_reply, SHORT])
    assert draft_support_reply(llm, TICKET, policy=POLICY) == SHORT
    first, second = llm.calls
    assert second["system"] == first["system"] == REPLY_TEMPLATE.format(policy=POLICY, max_words=60)
    assert (second["max_tokens"], second["temperature"]) == (300, 0.3)
    assert second["messages"][-1]["content"] == "That reply is 61 words. Rewrite it in at most 60 words, keeping the same facts."
