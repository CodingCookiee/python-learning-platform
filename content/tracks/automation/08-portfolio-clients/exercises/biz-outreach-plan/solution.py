from datetime import date, timedelta

RANK = {"referral": 0, "community": 1, "cold": 2}


def plan_outreach(prospects, *, today, daily_limit, suppressed=()):
    """(email, touch) for today's messages: allowed prospects, warmest and longest-waiting first."""
    blocked = {entry.lower() for entry in suppressed}

    def allowed(p):
        email = p["email"].lower()
        last = p.get("last_contacted")
        if p.get("replied") or p.get("opted_out"):
            return False
        if email in blocked or "@" + email.rsplit("@", 1)[1] in blocked:
            return False
        if p.get("touches", 0) >= 3:
            return False
        if last is not None and today - last < timedelta(days=7):
            return False
        if p["source"] == "cold" and not (p.get("note") or "").strip():
            return False
        return True

    ready = sorted(
        (p for p in prospects if allowed(p)),
        key=lambda p: (RANK[p["source"]], p.get("last_contacted") or date.min, p["email"].lower()),
    )
    return [(p["email"], p.get("touches", 0) + 1) for p in ready[:daily_limit]]
