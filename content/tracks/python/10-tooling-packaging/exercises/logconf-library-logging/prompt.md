`billing.py` is part of a payments library that three applications import. Each application has its
own logging config, and each one complains: importing `billing` changes their log format, their
level turns into `DEBUG`, and `charged INV-1042` appears on their screen from nowhere.

Fix the module so it behaves like a library:

- Importing it configures nothing: no `basicConfig`, no handlers, no levels.
- It logs through its own logger, named after the module with `__name__` (so when it's imported as
  `billing`, its records come from the `billing` logger, not the root).
- It never prints. Its messages go through logging and nowhere else.

What it returns and what it logs stay the same:

```python
charge("INV-1042", 25.5)   # "rcpt-inv-1042", logs INFO "Charging INV-1042 for 25.50"
charge("INV-1043", 0)      # None, logs WARNING "Refusing to charge INV-1043: amount 0.00"
```
