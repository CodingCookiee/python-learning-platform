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


def ask(llm, content, **options):
    return llm.complete([{"role": "user", "content": content}], **options)


def run_step(response, registry) -> str:
    if not response.tool_calls:
        return response.text
    outputs = []
    for call in response.tool_calls:
        try:
            outputs.append(registry[call.name](**call.arguments))
        except Exception as error:
            outputs.append({"error": str(error)})
    return json.dumps(outputs, default=str)


def plan_and_execute(llm, goal: str, tools: list[dict], registry: dict, *, max_plan_steps: int = 5) -> PlanRun:
    """Ask for a plan, check it, run each step, then write the answer."""
    plan = parse_plan(ask(llm, planner_prompt(goal, tools)).text)
    if not plan:
        raise PlanError("The planner returned no steps")
    if len(plan) > max_plan_steps:
        raise PlanError(f"The plan has {len(plan)} steps; the limit is {max_plan_steps}")

    results: list[str] = []
    for number in range(1, len(plan) + 1):
        response = ask(llm, step_prompt(goal, plan, number, results), tools=tools)
        results.append(run_step(response, registry))

    answer = ask(llm, answer_prompt(goal, plan, results)).text
    return PlanRun(plan, results, answer)
