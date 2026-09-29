Brightline's invoice agent sends payment reminders only after a person approves each one. Last
week a reminder was approved for `accounts@harbour.example`, the email service timed out, and the
model retried, to a different address with a rewritten body. Nobody was asked, and the email went
to the wrong person.

The `ApprovalGate` remembers approvals by **tool name**, so one yes covers every later call. Fix
it so an approval covers only the exact call that was approved:

- A risky call (tool name in `risky`) that the gate hasn't seen before is sent to
  `approver(name, arguments)`. Calls to other tools never ask.
- Remember each decision, yes or no, for that exact call: the same tool with the same arguments,
  in any order. Retrying the same call after a failure doesn't ask again, and neither does
  repeating a declined one: it's declined again.
- Any change to the arguments is a new call, and asks again.

A declined call returns the `DECLINED` error in the starter, and never runs the tool.

```python
llm = ScriptedLLM([
    tool_call("send_reminder", invoice_id="INV-2291", to="accounts@harbour.example", body="..."),   # approved; times out
    tool_call("send_reminder", invoice_id="INV-2291", to="priya@gmail.example", body="..."),       # must ask again
    "The reminder couldn't be sent. Please check the billing contact for Harbour Dental.",
])
run_agent(llm, TASK, TOOLS, ApprovalGate(REGISTRY, risky={"send_reminder"}, approver=approver))
# the approver is asked twice, and nothing is sent to priya@gmail.example
```
