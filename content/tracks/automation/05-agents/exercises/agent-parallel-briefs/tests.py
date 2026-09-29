import asyncio

from plp import hidden, test
from plp_fakes import Fail, ScriptedLLM
from solution import BRIEF_SYSTEM, brief_accounts


class AsyncLLM:
    """An async fake: each call waits some turns of the event loop, then answers from the script."""

    def __init__(self, replies, pauses=None):
        self.sync = ScriptedLLM(replies)
        self.pauses = pauses or {}
        self.in_flight = 0
        self.max_in_flight = 0

    @property
    def calls(self):
        return self.sync.calls

    async def complete(self, messages, **options):
        self.in_flight += 1
        self.max_in_flight = max(self.max_in_flight, self.in_flight)
        try:
            company = company_of(messages[0]["content"])
            for _ in range(self.pauses.get(company, 2)):
                await asyncio.sleep(0)
            return self.sync.complete(messages, **options)
        finally:
            self.in_flight -= 1


def company_of(content):
    return content.removeprefix("Write a two-line pre-call brief for ").removesuffix(".")


def brief(request):
    company = company_of(request["messages"][0]["content"])
    if company == "Broken Co":
        return Fail(500)
    return f"{company}: renewal due soon."


COMPANIES = ["Harbour Dental", "Kiln & Co", "Brightline"]


@test("Briefs the example accounts, in order")
async def _():
    llm = AsyncLLM([brief] * 3)
    assert await brief_accounts(llm, COMPANIES) == [f"{c}: renewal due soon." for c in COMPANIES]
    assert [call["system"] for call in llm.calls] == [BRIEF_SYSTEM] * 3


@test("Runs the calls concurrently")
async def _():
    llm = AsyncLLM([brief] * 3)
    await brief_accounts(llm, COMPANIES)
    assert llm.max_in_flight == 3, "All three calls should be in flight at once"


@test("Never has more than limit calls in flight")
async def _():
    companies = [f"Clinic {n}" for n in range(1, 8)]
    llm = AsyncLLM([brief] * 7)
    assert await brief_accounts(llm, companies, limit=2) == [f"{c}: renewal due soon." for c in companies]
    assert llm.max_in_flight == 2


@test("Keeps the input order when calls finish out of order")
async def _():
    llm = AsyncLLM([brief] * 3, pauses={"Harbour Dental": 6, "Kiln & Co": 1, "Brightline": 3})
    assert await brief_accounts(llm, COMPANIES) == [f"{c}: renewal due soon." for c in COMPANIES]


@hidden("One failed call doesn't lose the others")
async def _():
    llm = AsyncLLM([brief] * 3)
    assert await brief_accounts(llm, ["Harbour Dental", "Broken Co", "Brightline"]) == [
        "Harbour Dental: renewal due soon.", None, "Brightline: renewal due soon."]


@hidden("The prompt names each company")
async def _():
    llm = AsyncLLM([brief])
    await brief_accounts(llm, ["Harbour Dental"])
    assert llm.calls[0]["messages"] == [{"role": "user", "content": "Write a two-line pre-call brief for Harbour Dental."}]
