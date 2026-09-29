Every Monday you want a summary of how the job search is going. Write `weekly_summary(conn)`,
which reads the `applications` table from a `sqlite3` connection and returns a CSV report as a
string, one row per week:

| Column | Meaning |
|--------|---------|
| `week` | The Monday the week starts on, as `2026-09-07` |
| `applied` | Applications sent that week |
| `responses` | Of those, how many got any answer (status isn't `'applied'`) |
| `interviews` | How many reached an interview (status `'interview'` or `'offer'`) |
| `offers` | How many became offers |
| `response_rate` | `responses` as a percentage of `applied`, to 1 decimal place |

Every week from the first application's week to the last one's appears, in order; a week with no
applications has zeros, and a `response_rate` of `0.0`. With no applications at all, the report is
just the header line.

```text
week,applied,responses,interviews,offers,response_rate
2026-08-31,3,2,1,0,66.7
2026-09-07,0,0,0,0,0.0
2026-09-14,2,1,1,1,50.0
```

The table is `applications (id, company, applied_on, status)`, with `applied_on` an ISO date and
`status` one of `'applied'`, `'interview'`, `'offer'` or `'rejected'`.
