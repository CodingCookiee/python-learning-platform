A service level agreement (SLA) for an AI system should promise what you control: how fast you
respond, and how well the system scores on an agreed test. It shouldn't promise what you don't:
the AI provider's uptime, or a model that's never wrong. Write `review_sla(sla, *, provider_uptime)`,
which returns the problems with a draft, in this order.

`sla` is a dict; every key is optional:

| Key | Meaning |
|-----|---------|
| `uptime` | the monthly uptime you promise, as a percentage `Decimal` |
| `excludes_provider_outages` | `True` if the uptime promise doesn't count the AI provider's outages |
| `response_hours` | how many working hours until you respond to an incident |
| `accuracy` | `{"target": Decimal percentage, "measured_on": "what it's measured on"}` |
| `fix_hours` | a promise to fix any problem within this many hours |

1. When `uptime` is more than `provider_uptime` and provider outages aren't excluded:
   `uptime of <uptime>% is more than the AI provider's <provider_uptime>%: exclude provider outages or lower it`
2. When there's no `response_hours`: `say how quickly you'll respond`
3. When there's an accuracy promise with a target of 100 or more:
   `no AI system is 100% accurate: promise a score on a test set`
4. When there's an accuracy promise with a missing or blank `measured_on`:
   `say what accuracy is measured on`
5. When there's a `fix_hours`: `promise a response and a workaround, not a fix time`

```python
review_sla({"uptime": Decimal("99.9"), "response_hours": 4,
            "accuracy": {"target": Decimal("100")}, "fix_hours": 24},
           provider_uptime=Decimal("99.5"))
# ["uptime of 99.9% is more than the AI provider's 99.5%: exclude provider outages or lower it",
#  "no AI system is 100% accurate: promise a score on a test set",
#  "say what accuracy is measured on",
#  "promise a response and a workaround, not a fix time"]
```
