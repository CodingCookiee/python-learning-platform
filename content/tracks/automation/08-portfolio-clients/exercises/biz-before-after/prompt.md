A case study leads with its numbers, in the same format every time. Write
`before_after(label, before, after, unit)`, which returns

```text
<label>: <before> → <after> <unit> (<change>%)
```

where the change is the percentage change from `before` to `after`, rounded half up to a whole
number, always with its sign (`+288%`, `-94%`). `before` and `after` are ints or `Decimal`s, shown
as they are. When `before` is 0 a percentage means nothing, so leave the bracket off.

```python
before_after("Reminder calls", 90, 5, "min a day")
# "Reminder calls: 90 → 5 min a day (-94%)"
```
