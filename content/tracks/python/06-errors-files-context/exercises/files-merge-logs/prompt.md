An online shop's server writes one log per day into a folder. Support wants them as a single file.
Write `merge_logs(folder, output)` that merges every `.log` file directly inside `folder` into the
file `output`, and returns how many logs it merged:

- take the logs in order of file name, and ignore everything else, including subfolders,
- write each one as a header line `== <file name> ==` followed by the log's contents,
- if a log doesn't end with a newline, add one, so the next header starts on its own line,
- skip empty logs entirely, header and all.

For a folder holding `app-2026-09-01.log`, `app-2026-09-02.log` (whose last line has no newline),
an empty `app-2026-09-03.log` and a `notes.txt`:

```python
merge_logs(folder, output)    # 2
```

```text
== app-2026-09-01.log ==
09:00 server started
09:05 order A1001 paid
== app-2026-09-02.log ==
10:12 order A1002 refunded
```

Logs and output are UTF-8. `folder` and `output` may be paths or strings, `output` is never inside
`folder`, and an existing `output` file is replaced.
