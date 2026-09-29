Wholesale customers get one invoice a month, and the biggest now order tens of thousands of lines.
Their invoices take far longer than the small ones, far more than the extra lines explain.

```python
print(render_invoice("INV-2026-0931", [
    ("MUG-01", "Stoneware mug, speckled", 24, 850),
    ("FLT-100", "V60 paper filters, pack of 100", 60, 235),
]))
```

```text
Invoice INV-2026-0931
MUG-01    Stoneware mug, speckled          24 x     8.50 =     204.00
FLT-100   V60 paper filters, pack of 100   60 x     2.35 =     141.00
Total                                                          345.00
```

Make `render_invoice` build its text in linear time, fast enough for a 16 000-line invoice inside
the time limit. The text must be exactly the same, character for character.
