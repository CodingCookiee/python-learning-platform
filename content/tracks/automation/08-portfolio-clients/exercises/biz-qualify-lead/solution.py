from decimal import Decimal

STEPS = ["qualified", "follow up", "not now"]


def qualify(notes, *, min_budget):
    """Score a prospect on budget, authority, need and timeline, and decide what to do next."""
    budget = notes.get("budget")
    decision_maker = notes.get("decision_maker")
    pain = notes.get("monthly_pain")
    start = notes.get("start_within_days")
    checks = {
        "budget": (budget, budget is not None and budget >= min_budget),
        "authority": (decision_maker, decision_maker is True),
        "need": (pain, pain is not None and pain * 12 >= min_budget),
        "timeline": (start, start is not None and start <= 90),
    }
    score = 25 * sum(met for _, met in checks.values())
    unknowns = [name for name, (value, _) in checks.items() if value is None]

    if score >= 75 and checks["budget"][1]:
        verdict = "qualified"
    elif score >= 50:
        verdict = "follow up"
    else:
        verdict = "not now"
    flags = len(notes.get("red_flags", []))
    if flags >= 2:
        verdict = "decline"
    elif flags == 1:
        verdict = STEPS[min(STEPS.index(verdict) + 1, len(STEPS) - 1)]
    return {"score": score, "verdict": verdict, "unknowns": unknowns}
