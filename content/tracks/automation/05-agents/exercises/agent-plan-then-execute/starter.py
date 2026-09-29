import json
import re
from dataclasses import dataclass


class PlanError(Exception):
    """The plan can't be executed: empty, or too long."""


@dataclass
class PlanRun:
    plan: list[str]
    results: list[str]
    answer: str


def parse_plan(text):
    return [m.group(1).strip() for m in re.finditer(r"^\s*\d+[.)]\s+(.+)$", text, re.MULTILINE)]


def planner_prompt(goal, tools):
    names = ", ".join(tool["name"] for tool in tools)
    return (f"Write a numbered plan to reach the goal: one short step per line, each doable with one "
            f"tool call or by writing text.\nTools: {names}\n\nGoal: {goal}")


def step_prompt(goal, plan, number, results):
    return (f"Goal: {goal}\n\nPlan:\n" + "\n".join(f"{n}. {s}" for n, s in enumerate(plan, start=1))
            + f"\n\nResults so far:\n{json.dumps(results)}\n\nDo step {number} now: {plan[number - 1]}")


def answer_prompt(goal, plan, results):
    return f"Goal: {goal}\n\nResults of each step:\n{json.dumps(results)}\n\nWrite the final answer for the account manager."


def plan_and_execute(llm, goal, tools, registry, *, max_plan_steps=5):
    """Ask for a plan, check it, run each step, then write the answer."""
    ...
