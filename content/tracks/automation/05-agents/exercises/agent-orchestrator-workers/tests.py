import asyncio
import json

from plp import hidden, raises_async, test
from plp_fakes import ScriptedLLM
from solution import (ORCHESTRATOR_SYSTEM, SYNTHESISER_SYSTEM, WORKER_SYSTEM, Report, orchestrator_prompt,
                      review_account, synthesis_prompt, worker_prompt)


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
            title = next((t for t in self.pauses if f"Your part: {t}\n" in messages[0]["content"]), None)
            for _ in range(self.pauses.get(title, 2)):
                await asyncio.sleep(0)
            return self.sync.complete(messages, **options)
        finally:
            self.in_flight -= 1


TASK = "Renewal review for Harbour Dental (C-301)"
SUBTASKS = [
    {"title": "Support history", "instructions": "Summarise open and recent tickets."},
    {"title": "Billing", "instructions": "Unpaid invoices and payment habits."},
    {"title": "Product usage", "instructions": "Seats used and usage trend."},
]
FINDINGS = {"Support history": "2 open tickets; T-881 (export fails) is urgent.",
            "Billing": "INV-2291 is 18 days overdue; usually pays within 10 days.",
            "Product usage": "18 of 20 seats used, up 12% this quarter."}
ANSWER = "Healthy account: fix T-881 before the call, mention INV-2291 gently, and offer 5 more seats."


def worker(request):
    content = request["messages"][0]["content"]
    return next(finding for title, finding in FINDINGS.items() if f"Your part: {title}\n" in content)


def script(subtasks=SUBTASKS):
    return [json.dumps(subtasks)] + [worker] * len(subtasks) + [ANSWER]


@test("Runs the example review")
async def _():
    llm = AsyncLLM(script())
    report = await review_account(llm, TASK)
    assert report == Report(SUBTASKS, [FINDINGS[s["title"]] for s in SUBTASKS], ANSWER)
    assert len(llm.calls) == 5


@test("Sends each call its prompt and system prompt")
async def _():
    llm = AsyncLLM(script())
    report = await review_account(llm, TASK)
    assert llm.calls[0]["messages"] == [{"role": "user", "content": orchestrator_prompt(TASK)}]
    assert llm.calls[0]["system"] == ORCHESTRATOR_SYSTEM
    worker_contents = sorted(call["messages"][0]["content"] for call in llm.calls[1:4])
    assert worker_contents == sorted(worker_prompt(TASK, s) for s in SUBTASKS)
    assert [call["system"] for call in llm.calls[1:4]] == [WORKER_SYSTEM] * 3
    assert llm.calls[4]["messages"] == [{"role": "user", "content": synthesis_prompt(TASK, SUBTASKS, report.findings)}]
    assert llm.calls[4]["system"] == SYNTHESISER_SYSTEM


@test("The workers run concurrently, and findings keep subtask order")
async def _():
    llm = AsyncLLM(script(), pauses={"Support history": 6, "Billing": 1, "Product usage": 3})
    report = await review_account(llm, TASK)
    assert llm.max_in_flight == 3
    assert report.findings == [FINDINGS[s["title"]] for s in SUBTASKS]


@test("Too many subtasks: refused before any worker runs")
async def _():
    llm = AsyncLLM([json.dumps(SUBTASKS * 2)])
    await raises_async(ValueError, review_account, llm, TASK)
    assert len(llm.calls) == 1
    llm = AsyncLLM([json.dumps(SUBTASKS)])
    await raises_async(ValueError, review_account, llm, TASK, max_workers=2)


@hidden("Malformed plans are refused")
async def _():
    for reply in ["Here are the subtasks: support, billing", "[]", json.dumps({"title": "Billing"}),
                  json.dumps([{"title": "Billing"}]), json.dumps([{"title": 3, "instructions": "x"}])]:
        llm = AsyncLLM([reply])
        await raises_async(ValueError, review_account, llm, TASK)
        assert len(llm.calls) == 1


@hidden("One subtask works too")
async def _():
    llm = AsyncLLM(script(SUBTASKS[1:2]))
    report = await review_account(llm, TASK, max_workers=1)
    assert report.findings == [FINDINGS["Billing"]]
