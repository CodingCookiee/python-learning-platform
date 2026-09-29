The agency owner's Google Sheet has the columns *Received*, *Name*, *Email*, *Company* and
*Source*, in that order. Write `append_leads(client, spreadsheet_id, leads, columns, sheet="Leads")`
that appends one row per lead and returns how many rows the Sheets API says it added.

- `client` is an `httpx.Client` with `base_url` `https://sheets.googleapis.com/v4` and auth
  already set up.
- `columns` lists the lead keys in the sheet's column order, for example
  `["received_at", "name", "email", "company", "source"]`.
- Send one request, `POST /spreadsheets/<spreadsheet_id>/values/<sheet>:append` with the query
  parameter `valueInputOption=RAW` and the body `{"values": [row, row, ...]}`, where each row is a
  list of cells in column order.
- A missing key or `None` becomes `""`. A `datetime` becomes ISO text to the second,
  `"2026-03-09T08:14:00+00:00"`. Other values are sent as they are.
- The API answers `{"updates": {"updatedRows": <n>, ...}}`; return that number. Raise httpx's
  `HTTPStatusError` for an error status.
- With no leads, send nothing and return `0`.

```python
append_leads(client, "1BxiMVs0XRA5nFMd", [amira], ["received_at", "name", "email", "company", "source"])
# 1, after sending {"values": [["2026-03-09T08:14:00+00:00", "Amira Haddad", "amira@example.com", "Haddad Physio", "website"]]}
```
