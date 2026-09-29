from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import finish_arguments

ASK = [{"role": "user", "content": "checkout-api is failing"}]


def respond(reply):
    return ScriptedLLM([reply]).complete(ASK)


@test("Returns the finish call's arguments")
def _():
    response = respond(tool_call("finish", answer="Deploy d-4417 broke checkout. Roll it back."))
    assert finish_arguments(response) == {"answer": "Deploy d-4417 broke checkout. Roll it back."}


@test("A plain reply hasn't finished")
def _():
    assert finish_arguments(respond("Let me check the recent deploys.")) is None


@test("Other tool calls haven't finished")
def _():
    assert finish_arguments(respond(tool_call("get_logs", service="checkout-api"))) is None


@hidden("Finds finish among other calls, and takes the first one")
def _():
    first = tool_call("finish", answer="Roll back d-4417.")
    second = tool_call("finish", answer="Something else")
    response = respond(Reply(tool_calls=[tool_call("get_logs", service="checkout-api"), first, second]))
    assert finish_arguments(response) == {"answer": "Roll back d-4417."}
