The operations team measured some slow jobs with two clocks: wall time (`time.perf_counter()`) and
CPU time (`time.process_time()`). Write `classify(cpu_seconds, wall_seconds)` that says which kind
of slow each one is, from the share of the wall time the CPU was busy:

| CPU time ÷ wall time | Returns |
|----------------------|---------|
| 0.8 or more | `"cpu-bound"` |
| 0.2 or less | `"io-bound"` |
| anything in between | `"mixed"` |

```python
classify(0.8, 12.0)     # "io-bound": the invoice export spent most of its time waiting
classify(4.9, 5.0)      # "cpu-bound": the thumbnail job kept the CPU busy
```

`wall_seconds` is always more than zero.
