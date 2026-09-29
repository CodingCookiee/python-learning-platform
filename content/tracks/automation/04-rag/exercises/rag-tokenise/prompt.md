Ledgerline's keyword search has to match error codes like `E-4012` exactly, and ignore case and
punctuation. Write `tokenise(text)`, which returns the text's tokens as a list, in order:

- lower-case;
- a token is a run of letters and digits (`a` to `z`, `0` to `9`); runs joined by single hyphens
  are one token, so `e-4012` and `invoice-number` stay whole;
- everything else (spaces, punctuation, symbols) separates tokens and is dropped;
- tokens in `STOP_WORDS` (in the starter) are dropped.

```python
tokenise("Error E-4012 when I export to Xero!")    # ["error", "e-4012", "export", "xero"]
```
