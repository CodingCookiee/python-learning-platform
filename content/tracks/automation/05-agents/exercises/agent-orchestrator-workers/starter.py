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


async def review_account(llm, task, *, max_workers=4):
    """Let a model split the task, run a worker per part concurrently, then combine the findings."""
    ...
