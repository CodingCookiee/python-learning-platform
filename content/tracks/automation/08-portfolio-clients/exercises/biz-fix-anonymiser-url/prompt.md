Before publishing a case study you run its text, including the screenshots' captions and the links
in it, through `scrub_emails(text)`, which should replace every email address with `[email]` and
change nothing else. A draft went out with this in it:

```python
scrub_emails("Booked via https://crm.example/contacts?email=amira@haddadphysio.example&tab=notes")
# should be "Booked via https://crm.example/contacts?email=[email]&tab=notes"
```

The scrubber left the address in the link, and it also misses emails in brackets and in `mailto:`
links. Links often percent-encode the `@` as `%40`, as in `?u=tom%40northfold.example`, and those
count as emails too. Fix it.
