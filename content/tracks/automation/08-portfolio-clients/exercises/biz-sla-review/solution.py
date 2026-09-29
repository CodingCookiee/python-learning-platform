from decimal import Decimal


def review_sla(sla, *, provider_uptime):
    """The promises in a draft SLA that an AI system's supplier can't keep, in checklist order."""
    problems = []
    uptime = sla.get("uptime")
    if uptime is not None and uptime > provider_uptime and not sla.get("excludes_provider_outages"):
        problems.append(f"uptime of {uptime}% is more than the AI provider's {provider_uptime}%: "
                        "exclude provider outages or lower it")
    if sla.get("response_hours") is None:
        problems.append("say how quickly you'll respond")
    accuracy = sla.get("accuracy")
    if accuracy is not None:
        if accuracy.get("target", 0) >= 100:
            problems.append("no AI system is 100% accurate: promise a score on a test set")
        if not (accuracy.get("measured_on") or "").strip():
            problems.append("say what accuracy is measured on")
    if sla.get("fix_hours") is not None:
        problems.append("promise a response and a workaround, not a fix time")
    return problems
