Clients often agree to a case study as long as they can't be identified, and even when they're
happy to be named, their staff and customers aren't part of that deal. Write
`anonymise(text, names)`, which returns the text with:

1. every email address replaced by `[email]` (use `EMAIL` from the starter);
2. every phone number replaced by `[phone]`: a run matching `PHONE` from the starter that contains
   **at least 9 digits** (shorter runs, like a date or an order number, stay as they are);
3. every name in `names`, a dict of real name → placeholder, replaced by its placeholder, ignoring
   case, as whole words only, and trying longer names first, so that "Brightsmile Dental Group"
   isn't half-replaced by a rule for "Brightsmile".

```python
anonymise(
    "Dr Sara Khan at Brightsmile Dental (sara@brightsmile.example, 020 7946 0321) said "
    "BRIGHTSMILE DENTAL's no-shows fell.",
    {"Brightsmile Dental": "a dental clinic", "Dr Sara Khan": "the practice owner"},
)
# "the practice owner at a dental clinic ([email], [phone]) said a dental clinic's no-shows fell."
```
