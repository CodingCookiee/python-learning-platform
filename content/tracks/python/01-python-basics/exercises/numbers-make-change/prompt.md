A self-service till pays out change in 25, 10, 5 and 1 cent coins, always using as many of the
biggest coin as it can before moving to the next. Write `make_change(cents)` that returns the number
of each coin as four ints, biggest coin first:

```python
make_change(68)    # (2, 1, 1, 3): two 25s, one 10, one 5 and three 1s
make_change(100)   # (4, 0, 0, 0)
```

`cents` is a whole number of cents, zero or more. Return the four counts separated by commas, the
way `swap` returned two values in the last lesson.
