import re

from plp import hidden, raises, test
from plp_fakes import ScriptedLLM
from solution import JUDGE_SYSTEM, Verdict, judge_faithfulness

SOURCES = [
    "Payment reminders are sent 3 and 10 days after the due date.",
    "You can turn reminders off for a single client in their settings.",
]
ANSWER = "Reminders go out 3 and 10 days after the due date [1], and a final one after 30 days."
EXPECTED_PROMPT = (
    "<sources>\n"
    "[1] Payment reminders are sent 3 and 10 days after the due date.\n"
    "[2] You can turn reminders off for a single client in their settings.\n"
    "</sources>\n\n"
    "<answer>\n"
    "Reminders go out 3 and 10 days after the due date [1], and a final one after 30 days.\n"
    "</answer>"
)


def number_checker(request):
    """A fake judge: any clause whose numbers don't all appear in the sources is unsupported."""
    content = request["messages"][0]["content"]
    sources = content.split("</sources>")[0]
    answer = content.split("<answer>\n")[1].split("\n</answer>")[0]
    source_numbers = set(re.findall(r"\b\d+\b", re.sub(r"\[\d+\]", "", sources)))
    unsupported = []
    for clause in re.split(r",\s*(?:and\s+)?|\.\s*", re.sub(r"\s*\[\d+\]", "", answer)):
        if clause and not set(re.findall(r"\b\d+\b", clause)) <= source_numbers:
            unsupported.append(clause)
    return '{"unsupported": %s}' % str(unsupported).replace("'", '"')


@test("Reports the unsupported claim in the example")
def _():
    llm = ScriptedLLM(['{"unsupported": ["a final one after 30 days"]}'])
    assert judge_faithfulness(llm, ANSWER, SOURCES) == Verdict(faithful=False, unsupported=["a final one after 30 days"])


@test("Sends numbered sources and the answer, with the judge's rules, at temperature 0")
def _():
    llm = ScriptedLLM(['{"unsupported": []}'])
    judge_faithfulness(llm, ANSWER, SOURCES)
    call = llm.calls[0]
    assert call["messages"] == [{"role": "user", "content": EXPECTED_PROMPT}]
    assert call["system"] == JUDGE_SYSTEM
    assert call["temperature"] == 0


@test("A judge that reads the prompt passes a supported answer and fails an embellished one")
def _():
    supported = "Reminders go out 3 and 10 days after the due date [1]."
    assert judge_faithfulness(ScriptedLLM([number_checker]), supported, SOURCES) == Verdict(True, [])
    assert judge_faithfulness(ScriptedLLM([number_checker]), ANSWER, SOURCES) == Verdict(False, ["a final one after 30 days"])


@test("An unreadable judge reply raises instead of passing")
def _():
    for reply in ("Looks faithful to me.", '{"supported": true}', '["a claim"]', '{"unsupported": "none"}', '{"unsupported": [3]}'):
        raises(ValueError, judge_faithfulness, ScriptedLLM([reply]), ANSWER, SOURCES)


@hidden("Strips claims and drops empty ones; no sources means no call")
def _():
    llm = ScriptedLLM(['{"unsupported": ["  a final one after 30 days ", "", "   "]}'])
    assert judge_faithfulness(llm, ANSWER, SOURCES) == Verdict(False, ["a final one after 30 days"])
    llm = ScriptedLLM(['{"unsupported": ["   "]}'])
    assert judge_faithfulness(llm, ANSWER, SOURCES) == Verdict(True, [])
    empty = ScriptedLLM([])
    raises(ValueError, judge_faithfulness, empty, ANSWER, [])
    assert empty.calls == []
