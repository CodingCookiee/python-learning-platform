The support assistant can look up orders on its own, but a refund or a cancellation should happen
only when a person says yes. Write `require_approval(registry, dangerous, approve, audit)`, which
returns a **new** registry (tool name to function) where:

- tools not named in `dangerous` are exactly the same functions as before;
- each dangerous tool first calls `approve(name, arguments)` (the tool's name and a dict of the
  keyword arguments the model sent). Only if it returns `True` does the real tool run, and its
  result is returned. Otherwise the tool doesn't run, and the result is
  `{"error": DECLINED.format(name=name)}` (`DECLINED` is in the starter), which tells the model what
  to say to the customer;
- if `approve` itself raises (Slack is down, say), that counts as declined: never run a dangerous
  tool without a clear yes;
- every dangerous call appends `(name, arguments, "approved")` or `(name, arguments, "declined")` to
  the `audit` list.

A name in `dangerous` that isn't in the registry raises `ValueError`: it's almost certainly a typo,
and a typo here means an unguarded refund. The original registry must not change.

```python
audit = []
guarded = require_approval(REGISTRY, {"issue_refund"}, approve=lambda name, args: args["amount"] <= 20, audit=audit)
guarded["issue_refund"](order_id="1042", amount=12.5)   # {"refunded": 12.5, "order_id": "1042"}
guarded["issue_refund"](order_id="1042", amount=480)
# {"error": "A person declined issue_refund. Tell the customer a team member will follow up."}
audit   # [("issue_refund", {"order_id": "1042", "amount": 12.5}, "approved"),
        #  ("issue_refund", {"order_id": "1042", "amount": 480}, "declined")]
```
