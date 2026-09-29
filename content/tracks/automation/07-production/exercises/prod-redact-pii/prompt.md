The lesson's `redact` is a start, but it misses card numbers and API keys, and its phone pattern
also eats invoice references and long order numbers, which the support team needs in the traces.
Write a stricter one for the support bot's logs.

`redact(text)` replaces, in this order:

1. **Secrets** with `[SECRET]`: `sk-` followed by 16 or more letters, digits, `_` or `-` (the shape of
   both providers' keys), and the token after `Bearer ` (16 or more characters from
   `A-Za-z0-9._~+/=-`), leaving the word `Bearer` itself.
2. **Email addresses** with `[EMAIL]`.
3. **Card numbers** with `[CARD]`: 13 to 19 digits, optionally separated by single spaces or dashes,
   **that pass the Luhn check**. Any other run of digits is left alone.
4. **Phone numbers** with `[PHONE]`: starting with `+` or `0` (not in the middle of a word), made of
   digits, spaces, dashes and brackets, ending in a digit, with 10 to 15 digits in total. Shorter
   numbers are left alone.

Everything else is unchanged: order numbers, invoice ids, dates, amounts and tracking numbers.
Write `luhn_ok(digits)` too, for a string of digits: from the right, double every second digit
(subtracting 9 from any result over 9) and add everything up; the number is valid when the total is a
multiple of 10.

```python
redact("Ada (ada.byrne@example.com, +44 7700 900123) paid with 4111 1111 1111 1111 for order 1042.")
# "Ada ([EMAIL], [PHONE]) paid with [CARD] for order 1042."

redact("Order 1042, INV-2291, due 2026-10-01, tracking 1234 5678 9012 3456.")
# unchanged: that tracking number fails the Luhn check, and none of it is a phone number
```
