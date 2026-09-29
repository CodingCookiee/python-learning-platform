After each discovery call you paste your notes into `find_red_flags(notes)`, which returns what
each red-flag word means, in the order of the `RED_FLAGS` table. It's wrong in both directions.
These notes set off two alarms:

```python
find_red_flags("Their last freelancer left. The specification is a Word document.")
# []   (the fixed version: nothing here is a red flag)
```

and it misses the one that matters in `"Owner offered EQUITY instead of a fee."`.

Fix it so each word matches as a whole word, in any case. Keep the table as it is.
