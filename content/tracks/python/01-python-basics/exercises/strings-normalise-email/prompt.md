Sign-up forms collect email addresses with stray spaces and random capitals, so the same customer
ends up with two accounts. Write `normalise_email(raw)` that returns the address with whitespace
removed from both ends and every letter in lower case:

```python
normalise_email("  Ada.Lovelace@Example.COM ")   # "ada.lovelace@example.com"
```
