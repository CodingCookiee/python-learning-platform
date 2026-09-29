Last Tuesday the CRM's reporting API accepted a connection and never answered. The nightly job sat
waiting until someone killed it the next morning, and none of the other reports ran. The reason is
in `make_client`: the weekly export can take 45 seconds, so someone switched the timeout off.

Fix `make_client` and `fetch_export` so that:

- the client uses a timeout of 3 seconds to connect and 10 seconds for everything else,
- `fetch_export` gives the export itself 60 seconds (connect stays at 3),
- when the export times out, `fetch_export` returns `None`, so the job can move on to the next
  report and try this one again tomorrow,
- any other problem (an error status, a refused connection) still raises as before.

```python
client = make_client(transport)
fetch_export(client, "weekly-pipeline")   # {"report": "weekly-pipeline", "rows": [...]}
fetch_export(client, "stuck-report")      # None, after the 60-second read timeout
```
