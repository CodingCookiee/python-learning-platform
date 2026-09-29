`sync_orders(orders, shop)` uploads a day's orders to a marketplace's API, skipping any it can't
reach, and returns how many it uploaded. Its diagnostics are `print()` calls with a level written
at the front, plus a `traceback.print_exc()`, so they're mixed into the job's normal output and
can't be turned down. Refactor them to logging, through a logger for the module:

| Now | Becomes |
|-----|---------|
| `DEBUG: syncing 3 orders` | `DEBUG` message `syncing 3 orders` |
| `ERROR: could not upload order A1002`, then the traceback | `ERROR` message `could not upload order A1002`, with the traceback attached |
| `INFO: synced all 3 orders` | `INFO` message `synced all 3 orders` |
| `WARNING: synced 2 of 3 orders` | `WARNING` message `synced 2 of 3 orders` |

```python
sync_orders([{"id": "A1001"}, {"id": "A1002"}, {"id": "A1003"}], shop)   # 2 when A1002 fails
```

The function must return the same counts as before, and print nothing at all.
