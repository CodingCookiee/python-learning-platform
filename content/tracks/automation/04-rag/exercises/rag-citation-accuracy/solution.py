def grade_answer(case):
    """The problems with one answer's citations and refusal, in a fixed order; [] if none."""
    if case["refused"]:
        return ["refused an answerable question"] if case["answerable"] else []
    problems = []
    if not case["answerable"]:
        problems.append("answered a question the documents don't cover")
    for chunk_id in case["cited"]:
        if chunk_id not in case["given"]:
            problems.append(f"cited {chunk_id}, which it wasn't given")
    if case["answerable"] and not set(case["cited"]) & set(case["relevant"]):
        problems.append("none of its citations are relevant")
    return problems


def pass_rate(cases):
    """The fraction of cases with no problems, rounded to 3 places."""
    if not cases:
        raise ValueError("no cases to grade")
    return round(sum(not grade_answer(case) for case in cases) / len(cases), 3)
