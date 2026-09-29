import asyncio
import json
from dataclasses import dataclass

ORCHESTRATOR_SYSTEM = ('Split the task into 1 to 4 independent subtasks. Reply with JSON only: '
                       '[{"title": "...", "instructions": "..."}].')
WORKER_SYSTEM = "You research one part of an account review for Northwind. Report facts in three sentences at most."
SYNTHESISER_SYSTEM = "You combine research findings into one account review with a recommended next step."


@dataclass
class Report:
    subtasks: list[dict]
    findings: list[str]
    answer: str


def orchestrator_prompt(task):
    return f"Task: {task}"


def worker_prompt(task, subtask):
    return f"Overall task: {task}\n\nYour part: {subtask['title']}\n{subtask['instructions']}"


def synthesis_prompt(task, subtasks, findings):
    parts = "\n\n".join(f"## {s['title']}\n{finding}" for s, finding in zip(subtasks, findings))
    return f"Task: {task}\n\nFindings:\n\n{parts}"


def parse_subtasks(reply: str, max_workers: int) -> list[dict]:
    try:
        subtasks = json.loads(reply)
    except ValueError as error:
        raise ValueError(f"The orchestrator's reply isn't JSON: {error}") from None
    if not isinstance(subtasks, list) or not 1 <= len(subtasks) <= max_workers:
        raise ValueError(f"Expected a list of 1 to {max_workers} subtasks")
    for subtask in subtasks:
        if not (isinstance(subtask, dict) and isinstance(subtask.get("title"), str)
                and isinstance(subtask.get("instructions"), str)):
            raise ValueError(f"Each subtask needs a string title and instructions, got {subtask!r}")
    return subtasks


async def ask(llm, content: str, system: str) -> str:
    response = await llm.complete([{"role": "user", "content": content}], system=system)
    return response.text


async def review_account(llm, task: str, *, max_workers: int = 4) -> Report:
    """Let a model split the task, run a worker per part concurrently, then combine the findings."""
    subtasks = parse_subtasks(await ask(llm, orchestrator_prompt(task), ORCHESTRATOR_SYSTEM), max_workers)
    findings = await asyncio.gather(*(ask(llm, worker_prompt(task, s), WORKER_SYSTEM) for s in subtasks))
    answer = await ask(llm, synthesis_prompt(task, subtasks, list(findings)), SYNTHESISER_SYSTEM)
    return Report(subtasks, list(findings), answer)
