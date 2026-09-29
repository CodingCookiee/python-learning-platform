Every Monday the partner wants a refunds summary from the shop's export. Write
`refund_report(export_text)`: it takes the export's CSV text and returns the report's CSV text.

The export has the columns `order_id,date,reason,amount`. The report groups refunds by reason:

- one row per reason: the reason, the number of refunds, the total (two decimal places), and its
  share of everything refunded as a percentage (one decimal place);
- rows sorted by total, largest first, with ties in reason order;
- a last row `TOTAL` with the overall count, total and `100.0`.

Exports are messy, so:

- treat `Damaged`, `damaged ` and `DAMAGED` as the same reason, written `damaged`;
- skip blank rows, and repeated header rows (someone pasted two exports together);
- add money up exactly.

```python
export = """order_id,date,reason,amount
1042,2026-03-02,Damaged,12.50
1043,2026-03-02,late delivery,30.00
1044,2026-03-03,damaged ,7.50
1045,2026-03-04,Wrong size,45.00
1046,2026-03-05,Late Delivery,15.00
"""
print(refund_report(export))
```

```text
reason,refunds,total,share
late delivery,2,45.00,40.9
wrong size,1,45.00,40.9
damaged,2,20.00,18.2
TOTAL,5,110.00,100.0
```

End each line with `\n`. If there are no refunds at all, the report is the header and
`TOTAL,0,0.00,0.0`.
