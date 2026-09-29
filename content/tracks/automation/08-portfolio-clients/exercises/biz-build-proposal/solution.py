from decimal import ROUND_HALF_UP, Decimal


def problems(p):
    found = []
    if not (p.get("goal") or "").strip():
        found.append("the goal is empty")
    if not p.get("deliverables"):
        found.append("there are no deliverables")
    for item in p.get("deliverables", []):
        if not item.get("acceptance"):
            found.append(f"'{item['title']}' has no acceptance criteria")
    if not p.get("out_of_scope"):
        found.append("nothing is listed as out of scope")
    percents = sum(percent for _, percent, _ in p.get("milestones", []))
    if percents != 100:
        found.append(f"milestones add up to {percents}%, not 100%")
    if not p.get("risks"):
        found.append("no risks are listed")
    for risk in p.get("risks", []):
        if not (risk.get("mitigation") or "").strip():
            found.append(f"risk '{risk['risk']}' has no mitigation")
    return found


def amounts(total, milestones):
    total = Decimal(total)
    result, invoiced = [], Decimal("0")
    for index, (_, percent, _) in enumerate(milestones):
        if index == len(milestones) - 1:
            amount = total - invoiced
        else:
            amount = (total * percent / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        invoiced += amount
        result.append(amount)
    return result


def build_proposal(p):
    """A markdown proposal with the six required sections, or ValueError listing what's missing."""
    found = problems(p)
    if found:
        raise ValueError("; ".join(found))

    deliverables = p["deliverables"]
    criteria = ["## Acceptance criteria"]
    for number, item in enumerate(deliverables, 1):
        criteria.append(f"### {number}. {item['title']}")
        criteria += [f"- {line}" for line in item["acceptance"]]

    milestones = ["## Milestones", "| Milestone | Week | Amount |", "|-----------|------|--------|"]
    for (name, _, week), amount in zip(p["milestones"], amounts(p["total"], p["milestones"])):
        milestones.append(f"| {name} | {week} | {amount:,.2f} |")
    milestones.append(f"| Total | | {Decimal(p['total']):,.2f} |")

    sections = [
        [f"# {p['title']}"],
        ["## Goal", p["goal"]],
        ["## Deliverables"] + [f"{n}. {item['title']}" for n, item in enumerate(deliverables, 1)],
        criteria,
        ["## Out of scope"] + [f"- {line}" for line in p["out_of_scope"]],
        milestones,
        ["## Assumptions and risks"]
        + [f"- {line}" for line in p.get("assumptions", [])]
        + [f"- Risk: {r['risk']}. Mitigation: {r['mitigation']}." for r in p["risks"]],
    ]
    return "\n\n".join("\n".join(lines) for lines in sections)
