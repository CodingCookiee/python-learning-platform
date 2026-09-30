The first monitoring script for the invoice extractor sent a Slack message every minute an alert
condition held: 140 messages during one outage, so people muted the channel, and missed the real
alert the next week. Write `AlertManager(rules)`, which turns a stream of metric snapshots into
alert **events** that fire once and resolve once.

A `Rule(name, metric, op, threshold, for_checks=1)` (in the starter) breaches when
`metrics[metric] > threshold` (`op=">"`) or `< threshold` (`op="<"`). An unknown `op`, or a
`for_checks` below 1, raises `ValueError` when the manager is created.

`check(metrics)` evaluates every rule, in order, against one snapshot (a dict of metric name to
number), and returns the list of `Event(rule, state, value)` that happened:

- A rule starts **firing**, with an `Event(name, "firing", value)`, once it has breached on
  `for_checks` consecutive checks. While it keeps breaching, no more events.
- A firing rule that stops breaching emits `Event(name, "resolved", value)` once. Any check that
  doesn't breach resets the consecutive count.
- A metric missing from the snapshot leaves that rule exactly as it was.

`firing` is the list of rule names firing now, in rule order.

```python
manager = AlertManager([
    Rule("error rate", "error_rate", ">", 0.05),
    Rule("quality drift", "eval_pass_rate", "<", 0.90, for_checks=2),
])
manager.check({"error_rate": 0.01, "eval_pass_rate": 0.88})   # []  (one bad night isn't drift yet)
manager.check({"error_rate": 0.12, "eval_pass_rate": 0.86})
# [Event('error rate', 'firing', 0.12), Event('quality drift', 'firing', 0.86)]
manager.check({"error_rate": 0.02, "eval_pass_rate": 0.85})   # [Event('error rate', 'resolved', 0.02)]
manager.firing                                                 # ['quality drift']
```
