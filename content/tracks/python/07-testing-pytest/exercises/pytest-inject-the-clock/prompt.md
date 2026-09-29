These trial functions ask the clock for today's date themselves, so their tests would pass or fail
depending on the day they run. Patching the clock doesn't help much, because `date.today` belongs to
a built-in type and can't be replaced: `monkeypatch.setattr(date, "today", ...)` raises `TypeError`.

```python
trial_days_left(date(2026, 9, 1))   # 5 if today is 10 Sep 2026, 0 a month later
```

Refactor both functions to take the date as a parameter called `today`, so the caller decides
what "today" is. The functions must no longer call `date.today()` themselves.

```python
trial_days_left(date(2026, 9, 1), today=date(2026, 9, 10))   # 5
trial_banner(date(2026, 9, 1), today=date(2026, 9, 14))      # "1 day left in your free trial"
trial_banner(date(2026, 9, 1), today=date(2026, 10, 1))      # "Your free trial has ended"
```

Everything else about them stays the same: the trial lasts 14 days from the signup date, and the
days left never go below 0.
