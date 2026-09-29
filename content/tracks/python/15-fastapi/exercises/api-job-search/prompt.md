The job board's search page sends its filters in the query string. Make `GET /jobs` apply them to
`JOBS` (given in the starter). Every parameter is optional:

| Parameter | Type | Default | Meaning |
|-----------|------|---------|---------|
| `q` | text | none | Only jobs whose title contains it, ignoring case |
| `remote` | bool | none | Only remote jobs (`true`) or only on-site ones (`false`) |
| `min_salary` | int, 0 or more | `0` | Only jobs paying at least this |
| `limit` | int, 1 to 50 | `10` | Return at most this many jobs |

The response is `{"count": ..., "jobs": [...]}`, where `count` is the number of jobs that match
*before* the limit is applied, and `jobs` keeps the order of `JOBS`. A value that breaks a rule is
refused with `422`.

```text
GET /jobs?q=backend&remote=true      ->  {"count": 2, "jobs": [<job 1>, <job 3>]}
GET /jobs?q=ENGINEER&limit=2         ->  {"count": 4, "jobs": [<job 1>, <job 3>]}
GET /jobs?min_salary=60000           ->  {"count": 2, "jobs": [<job 1>, <job 3>]}
GET /jobs?limit=0                    ->  422
```
