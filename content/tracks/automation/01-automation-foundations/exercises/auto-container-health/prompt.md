You look after a client's Docker host. Write `container_problems(run=subprocess.run)` for a
monitoring job that runs every five minutes and alerts when a container needs attention.

It runs `docker ps --all --format "{{json .}}"` through `run` as an argument list, with
`capture_output=True`, `text=True`, `check=True` and a timeout. Docker prints one JSON object per
container per line, like this (trimmed):

```text
{"Names":"clinic-api","State":"running","Status":"Up 3 hours (healthy)"}
{"Names":"clinic-worker","State":"exited","Status":"Exited (1) 12 minutes ago"}
{"Names":"clinic-migrate","State":"exited","Status":"Exited (0) 2 days ago"}
{"Names":"clinic-mailer","State":"restarting","Status":"Restarting (1) 8 seconds ago"}
```

Return a list of `(name, problem)` pairs sorted by name, where `problem` is one of:

| When | Problem |
|------|---------|
| `State` is `exited` with a non-zero exit code | `"exited with code <n>"` |
| `State` is `restarting` | `"restarting"` |
| `State` is `dead` | `"dead"` |
| `Status` contains `(unhealthy)` | `"unhealthy"` |

A container that exited with code `0` finished its job (a migration, a one-off task) and is fine.
For the output above:

```python
container_problems(run)
# [("clinic-mailer", "restarting"), ("clinic-worker", "exited with code 1")]
```
