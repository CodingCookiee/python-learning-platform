def applies(question, industry):
    industries = [name.lower() for name in question.get("industries", [])]
    return not industries or industry.lower() in industries


def pick_questions(bank, *, industry, covered=(), limit=8):
    """Must questions first, then one question per uncovered topic, up to limit."""
    candidates = [q for q in bank if applies(q, industry)]
    picked = [q for q in candidates if q.get("must", False)]
    used = set(covered) | {q["topic"] for q in picked}
    for question in candidates:
        if len(picked) >= limit:
            break
        if question.get("must", False) or question["topic"] in used:
            continue
        picked.append(question)
        used.add(question["topic"])
    return [q["text"] for q in picked]
