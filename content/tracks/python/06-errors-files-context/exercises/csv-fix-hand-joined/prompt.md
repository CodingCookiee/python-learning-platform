`write_contacts(path, contacts)` exports the CRM's contacts, each a dict with `name`, `email` and
`city`, to a CSV file with a header row. Most of the export looks fine, but the mailing tool that
imports it complains that some rows have more than three columns.

```python
contacts = [
    {"name": "Ada Lovelace", "email": "ada@example.com", "city": "London"},
    {"name": "Hopper, Grace", "email": "grace@example.com", "city": "Arlington, VA"},
    {"name": 'Margaret "Maggie" Hamilton', "email": "maggie@example.com", "city": "Boston"},
]
write_contacts(path, contacts)
```

Fix it so that reading the file back with `csv.DictReader` gives exactly the contacts that were
written, whatever commas and quotes their values contain. Write the file as UTF-8, and keep the
columns in the order `name`, `email`, `city`.
