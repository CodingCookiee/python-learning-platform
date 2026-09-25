`unique_emails(emails)` removes duplicate addresses from a mailing list, keeping the **first**
spelling of each and the original order. Addresses that differ only in case or surrounding spaces
count as the same address:

```python
unique_emails(["Ada@example.com", "grace@example.com", " ada@EXAMPLE.com", "ken@example.com"])
# ["Ada@example.com", "grace@example.com", "ken@example.com"]
```

It gives the right answers, but on a list of 50,000 signups it takes minutes: for every address it
rebuilds and scans a list of everything seen so far. Rewrite it to remember what it has seen in a
**set**, so each check is instant. The results must not change.
