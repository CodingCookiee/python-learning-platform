The website's contact form exports leads as a DataFrame of text columns, and the export is messy.
Write `clean_leads(leads)`, which returns a cleaned copy:

- `name`: surrounding spaces removed.
- `email`: surrounding spaces removed and lowercased. Rows with no email (missing, or only
  spaces) are dropped: nobody can reply to them.
- `budget`: a number. Values look like `"£5,000"`, `"12000"` or `"ask me"`; anything that isn't a
  number becomes a missing value.
- `submitted_at`: a datetime.
- People submit the form more than once. Keep only each email's **latest** submission.
- Rows sorted by `submitted_at`, numbered from 0, with the columns in the same order as the input.

Don't change the DataFrame you were given.

```python
clean_leads(leads)[["email", "budget"]].to_dict("records")
# [{"email": "grace@globex.example", "budget": 12000.0},
#  {"email": "ada@acme.example", "budget": 7500.0},
#  {"email": "linus@initech.example", "budget": nan}]
```
