---
slug: scheduling
title: Jobs on a schedule
summary: Read and check cron expressions, run jobs with cron, APScheduler and GitHub Actions, and write jobs that survive missed and repeated runs.
minutes: 45
exercises:
  - auto-predict-cron-utc
  - auto-cron-field
  - auto-fix-cron-weekday
  - auto-job-watermark
  - auto-next-run
lab:
  title: A job GitHub runs on a schedule
  kind: webhook
  instructions: >-
    Save your lab URL as a repository secret named LAB_URL and add the curl step from the lesson's
    last step to the workflow. It sends the event that started the run and the workflow's name. The
    check passes when a scheduled run sends it, not a click on "Run workflow".
  expect:
    event: schedule
    workflow: Weekly refunds report
---

The clinic's reminder planner from lesson 1 needs a trigger: every hour, on the hour, from 07:00 to
20:00 on weekdays. The bookkeeping firm wants its refunds report in the partner's inbox at 08:00
every Monday. Both are **schedules**, the oldest trigger there is. Scheduling looks easy until the
first time a job runs an hour late in summer, runs twice at once, or quietly doesn't run for a
week. This lesson covers the syntax, three places to run scheduled jobs, and how to write jobs
that don't care when, or how often, they're run.

## Schedule or event?

Before you reach for a schedule, ask whether the source system can tell you when something
happens. If a form tool can send a webhook when a lead arrives (lesson 4), use it: the lead is
handled in seconds, and nothing runs when nothing happens. A schedule is the right trigger when:

- the work is naturally periodic: a daily summary, a weekly report, a nightly backup;
- the source offers no events, so you **poll** it: "every 10 minutes, fetch orders changed since
  last time";
- you want to batch: one digest message an hour instead of a Slack ping per order.

```quiz
question: A shop platform can send a webhook when an order is refunded. The client wants a Slack message for every refund over £200. What trigger fits best?
options:
  - "A schedule: every minute, fetch all refunds and check them"
  - "The refund webhook: check the amount when each one arrives"
  - "A schedule: every night, list the day's large refunds"
answer: 1
explain: "When the source sends events, use them: each refund is handled in seconds, with no polling. A nightly digest is a different product (a summary), and a one-minute poll wastes calls and still runs late."
```

## Cron in five fields

Nearly every scheduler speaks **cron** syntax: five fields separated by spaces.

```text
┌───────── minute        0–59
│ ┌─────── hour          0–23
│ │ ┌───── day of month  1–31
│ │ │ ┌─── month         1–12
│ │ │ │ ┌─ day of week   0–7 (0 and 7 are both Sunday)
│ │ │ │ │
0 7-20 * * 1-5      on the hour, 07:00 to 20:00, Monday to Friday
```

Each field is a list of parts separated by commas, and each part is one of:

| Part | Means | Example (minute field) |
|------|-------|------------------------|
| `*` | every value | every minute |
| `N` | exactly N | `30`: at half past |
| `A-B` | A to B, inclusive | `0-10`: the first eleven minutes |
| `*/S` | every S-th value, from the lowest | `*/15`: 0, 15, 30, 45 |
| `A-B/S` | every S-th value from A to B | `9-17/2` in the hour field: 9, 11, 13, 15, 17 |
| `X,Y,Z` | any of the parts | `0,30`: on the hour and at half past |

Cron has no seconds, and the smallest unit is a minute. A field is easy to check in Python once you
split it into parts:

```python
expr = "0 7-20 * * 1-5"
dict(zip(["minute", "hour", "day", "month", "weekday"], expr.split()))
```

```quiz
question: "What does `30 8 * * 1` mean?"
options:
  - "Every 30 minutes from 08:00, on the first of the month"
  - "At 08:30 every Monday"
  - "At 08:30 on the first day of every month"
answer: 1
explain: "Minute 30, hour 8, any day of the month, any month, weekday 1 (Monday)."
```

## The day-of-month trap

When **both** day fields are restricted, cron runs when **either** matches, not both. `0 9 1 * 1`
does not mean "9am on the 1st, if it's a Monday": it means 9am on the 1st of every month **and**
9am every Monday. If either day field is `*`, only the other one counts. Every cron
implementation copied this rule from the original, so your own code has to follow it too, and
it's one of the drills.

```quiz
question: "When does `0 6 13 * 5` run?"
options:
  - "At 06:00 on every Friday the 13th"
  - "At 06:00 on the 13th of every month, and at 06:00 every Friday"
  - "Never; the fields contradict each other"
answer: 1
explain: "Both day fields are restricted, so cron ORs them: the 13th of each month, plus every Friday. There's no way to say 'Friday the 13th' in cron; you schedule every Friday and check the date inside the job."
```

## Which time zone?

A cron line has no time zone. It runs in the zone of whatever runs it: the server's local time for
a crontab, and **UTC** for GitHub Actions. The clinic is in London, which is UTC in winter and UTC+1
in summer, so `0 8 * * *` in UTC is 08:00 at the clinic in January and 09:00 in July:

```python
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

london = ZoneInfo("Europe/London")
[
    datetime(2026, month, 15, 8, 0, tzinfo=UTC).astimezone(london).strftime("%d %b %H:%M %Z")
    for month in (1, 7)
]
```

Your choices: run the scheduler in the client's zone (APScheduler takes a `timezone`), run twice
in UTC (`0 7,8 * * *`) and let the job check the local hour, or accept the drift if an hour
doesn't matter. And don't schedule anything between 01:00 and 03:00 local time: on the night the
clocks change, that hour happens twice or not at all.

## Three places to run a schedule

**cron on a Linux server.** `crontab -e` opens your table of jobs. Cron runs them with an almost
empty environment, in your home folder, and throws the output away, so be explicit about all three:

```bash
crontab -e
```

```text
# m h  dom mon dow  command
CRON_TZ=Europe/London
0 7-20 * * 1-5  cd /srv/clinic && /usr/bin/flock -n /tmp/reminders.lock /home/ada/.local/bin/uv run reminders.py >> logs/reminders.log 2>&1
```

`flock -n` skips a run if the previous one is still going, which prevents overlaps. `CRON_TZ` is
supported by cronie (Fedora, Arch and friends), not by every cron; check `man 5 crontab` on your
server.

**APScheduler inside a Python process.** Good when the schedule belongs to an app you already
run, like a FastAPI service. Use the stable 3.x line (`uv add "apscheduler<4"`):

```python norun
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from reminders import send_due_reminders

scheduler = BlockingScheduler(timezone="Europe/London")
scheduler.add_job(
    send_due_reminders,
    CronTrigger(day_of_week="mon-fri", hour="7-20", minute=0, timezone="Europe/London"),
    max_instances=1,          # never two runs at once
    coalesce=True,            # after downtime, run once, not once per missed slot
    misfire_grace_time=600,   # a run up to 10 minutes late still counts
)
scheduler.start()
```

> [!WARNING]
> APScheduler's `day_of_week` counts from **Monday = 0**, unlike cron's Sunday = 0. Use day names
> (`"mon-fri"`) and the problem disappears.

**GitHub Actions on a schedule.** Free for small jobs, no server to maintain, secrets built in:

```yaml
# .github/workflows/refunds-report.yml
name: Weekly refunds report
on:
  schedule:
    - cron: "0 7 * * 1"        # 07:00 UTC Monday, which is 08:00 in London in summer
  workflow_dispatch:            # adds a "Run workflow" button for manual runs
jobs:
  report:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
      - run: uv run report.py
        env:
          SHOP_API_KEY: ${{ secrets.SHOP_API_KEY }}
```

It runs in UTC, only on the default branch, can start several minutes late when GitHub is busy,
and, in public repositories, is switched off after 60 days without commits. Fine for reports, wrong
for "exactly at 09:00".

## Jobs that survive missed and repeated runs

Schedulers miss runs (the server rebooted) and double runs (someone clicked "Run workflow" while a
scheduled run was going). So write jobs that don't depend on running exactly once per slot:

- **Watermarks, not clock windows.** "Process orders from the last hour" loses an hour's orders
  every time a run is skipped. Instead, store the timestamp of the last record you processed and
  ask for everything after it.
- **Record what you did.** The reminder planner skips appointments marked `reminded`. A second
  run a minute later plans nothing.
- **Cap the batch.** After three days of downtime, don't send 4,000 Slack messages in one
  minute. Take the oldest 100, move the watermark past them, and let the next run take the rest.

```python
from datetime import UTC, datetime, timedelta

base = datetime(2026, 3, 9, 8, 0, tzinfo=UTC)
orders = [{"id": n, "created": base + timedelta(minutes=25 * n)} for n in range(1, 6)]

watermark = base + timedelta(minutes=30)          # saved by the last successful run
now = base + timedelta(hours=2)
batch = [o for o in orders if watermark < o["created"] <= now]
new_watermark = max((o["created"] for o in batch), default=watermark)
[o["id"] for o in batch], new_watermark.strftime("%H:%M")
```

Save the new watermark only after the batch's actions have succeeded. If the job crashes halfway,
the next run redoes the batch, and the "record what you did" rule makes the redo harmless.

## Do it on your machine

1. Write `tick.py` that appends the current time to `ticks.log`.
2. On Linux or macOS, add `* * * * * cd /path/to/folder && /full/path/to/uv run tick.py >> cron.log 2>&1`
   with `crontab -e`, wait three minutes, and check `ticks.log`. Remove the line afterwards.
   (On Windows, use Task Scheduler, or skip to step 3.)
3. `uv add "apscheduler<4"` and schedule `tick.py`'s function every minute with a `CronTrigger`.
   Stop it with Ctrl+C.
4. Put the GitHub Actions workflow above in a repository with `workflow_dispatch`, and run it from
   the Actions tab. Then change the cron to five minutes from now in UTC and watch it start (late).
5. **Check it:** save your lab URL (below this lesson) as the secret `LAB_URL`, add this last step
   to the job, and let the schedule run it:

   ```yaml
         - run: |
             curl -sf -X POST "$LAB_URL" -H "Content-Type: application/json" \
               -d '{"event": "${{ github.event_name }}", "workflow": "${{ github.workflow }}"}'
           env:
             LAB_URL: ${{ secrets.LAB_URL }}
   ```

## Where this leaves you

Cron is five fields, each a list of values, ranges and steps, with the day-of-month/day-of-week OR
rule on top. It runs in the scheduler's time zone, which is UTC on GitHub Actions. Keep jobs safe
to miss and safe to repeat with watermarks, records of what was done, and capped batches. The
drills make you a cron parser, a matcher, a next-run calculator and a watermark.
