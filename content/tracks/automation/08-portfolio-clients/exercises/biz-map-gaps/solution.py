def blank(value):
    """True for None, blank strings and empty collections."""
    if isinstance(value, str):
        return not value.strip()
    return not value


def process_gaps(process):
    """The follow-up questions for the next call, one for each gap in the process map."""
    context = process.get("context") or {}
    decisions = process.get("decisions") or []
    questions = []
    if blank(process.get("trigger")):
        questions.append("What starts this process?")
    if blank(process.get("volume")):
        questions.append("How often does it happen, and how long does it take each time?")
    if blank(context):
        questions.append("What information does the person look at?")
    if blank(decisions):
        questions.append("How do they decide what to do?")
    asked = []
    for decision in decisions:
        for field in decision.get("uses", []):
            if field not in context and field not in asked:
                asked.append(field)
    questions += [f"Where does '{field}' come from?" for field in asked]
    if decisions and blank(process.get("fallback")):
        questions.append("What happens when none of the rules fit?")
    if blank(process.get("actions")):
        questions.append("What changes, and in which system, when it's done?")
    if blank(process.get("owner")):
        questions.append("Who notices if it stops working?")
    return questions
