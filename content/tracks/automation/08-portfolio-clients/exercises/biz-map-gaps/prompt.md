After a first conversation you have a rough process map, and the gaps in it are your questions for
the next call. Write `process_gaps(process)`, which returns those follow-up questions as a list of
strings, in this order.

A process map is a dict. Every key is optional, and a missing key, `None`, a blank string or an
empty list or dict all count as missing:

| Key | Holds | If it's missing, ask |
|-----|-------|----------------------|
| `trigger` | what starts it | `What starts this process?` |
| `volume` | how often, how long | `How often does it happen, and how long does it take each time?` |
| `context` | a dict of field → the system it comes from | `What information does the person look at?` |
| `decisions` | a list of `{"rule": ..., "uses": [fields]}` | `How do they decide what to do?` |
| `fallback` | what happens when no rule fits | `What happens when none of the rules fit?` (only ask when there are decisions) |
| `actions` | a list of what changes | `What changes, and in which system, when it's done?` |
| `owner` | who looks after it | `Who notices if it stops working?` |

One more kind of question goes straight after the decisions question: for every field a rule
`uses` that isn't a key of `context`, ask `Where does '<field>' come from?`, once per field, in the
order the rules first mention them.

```python
recalls = {
    "trigger": "A patient is due a six-month check-up",
    "context": {"last visit": "Dentally", "phone": "Dentally"},
    "decisions": [
        {"rule": "Text them if they allow SMS", "uses": ["sms consent", "phone"]},
        {"rule": "Otherwise post a letter", "uses": ["address"]},
    ],
    "actions": ["Send the text or letter", "Log it on the patient record"],
}
process_gaps(recalls)
# ["How often does it happen, and how long does it take each time?",
#  "Where does 'sms consent' come from?",
#  "Where does 'address' come from?",
#  "What happens when none of the rules fit?",
#  "Who notices if it stops working?"]
```
