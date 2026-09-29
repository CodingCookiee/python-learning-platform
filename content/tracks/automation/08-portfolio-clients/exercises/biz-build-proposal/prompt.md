Put the lesson together: a function that turns structured scope into a proposal, and refuses to
produce one that a client couldn't accept. Write `build_proposal(p)`. `p` is a dict with the keys
`title`, `goal`, `deliverables` (each `{"title", "acceptance": [...]}`), `out_of_scope` (strings),
`total`, `milestones` (`(name, percent, week)` tuples), `assumptions` (strings) and `risks` (each
`{"risk", "mitigation"}`).

**First, check it.** Collect every problem, in this order, and if there are any, raise one
`ValueError` whose message is the problems joined with `"; "`:

- `the goal is empty` (missing or blank)
- `there are no deliverables`
- `'<title>' has no acceptance criteria`, for each deliverable without any
- `nothing is listed as out of scope`
- `milestones add up to <n>%, not 100%`
- `no risks are listed`
- `risk '<risk>' has no mitigation`, for each risk with a blank mitigation

**Then write it**, as sections separated by one blank line:

```text
# Monthly client reports for Harbour & Finch

## Goal
Every client gets an accurate monthly report on the 1st, without anyone building it by hand.

## Deliverables
1. Automated monthly report
2. AI-written summary

## Acceptance criteria
### 1. Automated monthly report
- A report for each of the 12 clients is emailed by 09:00 on the first working day
- Spend and conversion figures match the ad platforms' exports to the cent
### 2. AI-written summary
- An account manager can approve or edit each summary before it is sent
- At least 9 of 10 sample summaries pass the agreed review checklist

## Out of scope
- Changes to the agency's ad accounts
- Reports for clients added after sign-off, quoted separately

## Milestones
| Milestone | Week | Amount |
|-----------|------|--------|
| Deposit | 0 | 1,800.00 |
| Pilot with 2 clients | 3 | 2,400.00 |
| Handover | 5 | 1,800.00 |
| Total | | 6,000.00 |

## Assumptions and risks
- The agency provides read-only API access to both ad platforms by week 1
- Risk: an ad platform rate-limits the nightly export. Mitigation: fetch incrementally, retry with backoff, and alert after two failed nights.
```

Milestone amounts follow the invoice drill: each is its percentage of `total`, rounded half up to
the cent, except the last, which takes the remainder. Format them with `f"{amount:,.2f}"`. Each
risk line is `- Risk: <risk>. Mitigation: <mitigation>.` The example's data, `HARBOUR`, is at the
top of the tests; `build_proposal(HARBOUR)` returns the text above with no trailing newline.
