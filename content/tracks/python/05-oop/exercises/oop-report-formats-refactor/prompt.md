Two independent choices, the format (CSV or JSON) and the delivery (email or archive), have
turned into a subclass for every combination. Adding PDF and Slack would mean nine classes.
Refactor to composition, with these parts and no inheritance at all:

- `CsvFormat()` and `JsonFormat()`: each has an `extension` attribute (`"csv"`, `"json"`) and a
  `render(title, rows)` method returning the text, exactly as the old `render()` methods did.
- `EmailDelivery(to)` and `ArchiveDelivery(folder)`: each has a `deliver(filename, text, outbox)`
  method that appends to `outbox` the same tuple the old `publish()` methods did.
- `Report(title, rows, format, delivery)`: `publish(outbox)` builds the filename from the title and
  the format's extension, renders the text, and hands both to the delivery.

```python
rows = [{"sku": "MUG-01", "qty": 3}, {"sku": "LAMP-02", "qty": 0}]
outbox = []
Report("Low stock", rows, CsvFormat(), EmailDelivery("ops@example.com")).publish(outbox)
Report("Low stock", rows, JsonFormat(), ArchiveDelivery("reports/2026-09")).publish(outbox)
outbox
# [("email", "ops@example.com", "low-stock.csv", "sku,qty\nMUG-01,3\nLAMP-02,0"),
#  ("archive", "reports/2026-09/low-stock.json", '{"title": "Low stock", "rows": [...]}')]
```

The tests plug in formats and deliveries of their own, so keep to those method names. Keep the
`file_stem` helper, and remove the six old classes.
