Write `build_parser()`, which returns an `argparse.ArgumentParser` with `prog="backup"` for this
command line:

```text
backup SOURCE [--dest DEST] [--dry-run] [-k KEEP | --keep KEEP]
```

| Argument | Meaning | Default |
|----------|---------|---------|
| `source` | the folder to back up (required) | |
| `--dest` | where backups go | `"backups"` |
| `--dry-run` | a flag: list what would be copied, copy nothing | `False` |
| `-k`, `--keep` | how many old backups to keep, as an `int` | `7` |

```python
args = build_parser().parse_args(["photos", "--dry-run", "-k", "3"])
args.source, args.dest, args.dry_run, args.keep
# ("photos", "backups", True, 3)
```
