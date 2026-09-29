Build a small to-do CLI with three subcommands:

```text
tasks add TITLE [--due YYYY-MM-DD]
tasks list [--all]
tasks done ID
```

Write `main(argv, tasks)`. `tasks` is a list of dicts, each
`{"id": 3, "title": "Pay INV-1042", "due": date(2026, 10, 1), "done": False}` (`due` may be `None`).
In the real tool it's loaded from a JSON file; here the caller passes it in, and `main` changes it
in place. `main` returns the exit code. Use `prog="tasks"`.

- **`add TITLE [--due DATE]`** appends a task with the next id (one more than the highest, or `1`
  for an empty list), `done` set to `False`, and `due` as a `date` (or `None`). It prints
  `Added task 4: Pay INV-1042`.
- **`list`** prints the open tasks in id order, and **`list --all`** prints every task. Each line is
  the id right-aligned in 3, a space, `[ ]` or `[x]`, a space and the title, then ` (due 2026-10-01)`
  if it has a due date. With nothing to show, it prints `Nothing to do.`
- **`done ID`** marks the task done and prints `Completed task 3: Pay INV-1042`. If there's no task
  with that id, it prints `tasks: error: no task with id 9` to **stderr** and returns `1`.
- Every other outcome returns `0`. A missing subcommand, a due date that isn't `YYYY-MM-DD` and an id
  that isn't a number are argparse usage errors (`SystemExit(2)`).

```python
tasks = [{"id": 1, "title": "Send September invoices", "due": None, "done": True}]
main(["add", "Chase INV-1042", "--due", "2026-10-01"], tasks)   # prints "Added task 2: Chase INV-1042", returns 0
main(["list", "--all"], tasks)
#   1 [x] Send September invoices
#   2 [ ] Chase INV-1042 (due 2026-10-01)
```
