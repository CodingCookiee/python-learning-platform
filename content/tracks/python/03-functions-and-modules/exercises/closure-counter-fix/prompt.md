`make_counter(prefix)` should return a function that hands out numbered ticket ids for one help
desk. Calling it crashes instead:

```python
billing = make_counter("BILL")
billing()
# UnboundLocalError: cannot access local variable 'count' where it is not associated with a value
```

Fix it so that each counter counts up from 1 on its own:

```python
billing = make_counter("BILL")
support = make_counter("HELP")
billing()    # "BILL-001"
billing()    # "BILL-002"
support()    # "HELP-001"
```
