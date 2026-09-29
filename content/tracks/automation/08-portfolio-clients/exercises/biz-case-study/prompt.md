Put the lesson's pieces together. Write `render_case_study(study, names)`, which turns a finished
project into a markdown case study that leads with its result and names nobody. The starter
includes `anonymise()` and `before_after()` from the earlier drills; use them.

`study` is a dict with `client` (the real name, a key of `names`), `problem` (text), `approach` (a
list of steps), `metrics` (a list of `{"label", "before", "after", "unit"}`), and optionally
`period`, `stack` (a list of tools) and `quote`. `names` maps real names to placeholders, as in
`anonymise()`.

Raise `ValueError` if there are no metrics (a case study needs at least one number), or if the
first metric's `before` is 0 (the headline needs a percentage). Otherwise return these sections,
separated by blank lines, leaving out the optional ones that are missing or empty:

1. `# <first metric's label> <down|up> <N>% at <the client's placeholder>`, where N is the size of
   the first metric's change, rounded half up as in `before_after()`: "down" when it's negative.
2. The stack, joined with `" · "` (optional).
3. `## Result`, then `Measured over <period>:` (optional), then one `- ` line per metric from
   `before_after()`.
4. `## Problem`, then the problem.
5. `## Approach`, then one `- ` line per step.
6. The quote as `> "<quote>"` (optional).

Every piece of free text (the problem, each step and the quote) goes through `anonymise()`.

```python
print(render_case_study(BRIGHTSMILE, NAMES))   # both are in the tests
```

```text
# No-shows down 63% at a dental clinic

Python · FastAPI · an SMS API

## Result
Measured over the first three months:
- No-shows: 24 → 9 a month (-63%)
- Reminder calls: 90 → 5 min a day (-94%)

## Problem
Reception at a dental clinic spent 90 minutes every morning phoning patients about their appointments, and about 24 patients a month still didn't turn up.

## Approach
- Mapped the reminder process with the practice owner, including patients without SMS consent
- Built a scheduled job that texts or emails each patient 24 hours ahead, and lists the ones it couldn't reach
- Piloted it on one dentist's diary for two weeks before switching everyone over

> "Reception has its mornings back, and the diary is fuller than it's been for years."
```
