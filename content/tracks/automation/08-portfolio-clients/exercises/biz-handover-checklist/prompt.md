A handover is finished when the client can run the system without you. Write
`handover_gaps(pack, *, my_domain)`, which checks a handover pack and returns what's wrong with it,
as a list of strings in this order:

1. `missing file: <name>` for each of `REQUIRED_FILES` not in `pack["files"]`, in that order.
2. `secrets in the handover: <path>` for each file in `pack["files"]` (in order) whose name, after
   the last `/`, is exactly `.env`, or ends with `.pem` or `.key`. Secrets are handed over through
   the client's own accounts, never in a repository or a zip file.
3. `runbook section missing: <section>` for each of `RUNBOOK_SECTIONS` not in
   `pack["runbook_sections"]`, compared ignoring case.
4. `credential not owned by the client: <service>` for each of `pack["credentials"]` (dicts with
   `service` and `owner`) whose owner isn't `"client"`.
5. `alerts go to nobody` if `pack["alerts_to"]` is empty, or `alerts only reach you, not the client`
   if every address in it is at `my_domain` (compared ignoring case).
6. `no training session yet` unless `pack["training_done"]` is true.

A missing key counts as empty (or false).

```python
handover_gaps({
    "files": ["README.md", "RUNBOOK.md", "deploy/.env"],
    "runbook_sections": ["What it does", "Is it working?", "Common failures", "How to restart"],
    "credentials": [{"service": "OpenAI", "owner": "client"}, {"service": "Twilio", "owner": "me"}],
    "alerts_to": ["alerts@mystudio.example"],
    "training_done": True,
}, my_domain="mystudio.example")
# ["missing file: .env.example",
#  "secrets in the handover: deploy/.env",
#  "runbook section missing: Who to call",
#  "credential not owned by the client: Twilio",
#  "alerts only reach you, not the client"]
```
