from datetime import UTC, datetime
from zoneinfo import ZoneInfo

london = ZoneInfo("Europe/London")

# GitHub Actions runs "0 8 * * *" at 08:00 UTC. What time is that at the clinic?
for day in ["2026-01-12", "2026-07-13"]:
    run = datetime.fromisoformat(f"{day}T08:00").replace(tzinfo=UTC)
    local = run.astimezone(london)
    print(day, local.strftime("%H:%M"), local.tzname())

# Working backwards: which UTC hour gives 08:00 at the clinic?
for day in ["2026-01-12", "2026-07-13"]:
    wanted = datetime.fromisoformat(f"{day}T08:00").replace(tzinfo=london)
    print(day, wanted.astimezone(UTC).strftime("%H:%M"), "UTC")
