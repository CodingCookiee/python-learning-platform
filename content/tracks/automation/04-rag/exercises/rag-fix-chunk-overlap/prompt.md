Ledgerline's support bot sometimes can't answer questions whose answer is plainly in the help
centre. You look at the chunks and find that text is **missing** between them: the splitter's
overlap goes the wrong way.

Fix `chunk_fixed(text, size=500, overlap=100)` so that:

- every chunk is at most `size` characters, and each one starts `size - overlap` characters after
  the previous one, so consecutive chunks share exactly `overlap` characters;
- the chunks cover the whole text, and the last one ends at the end of the text, with no extra
  window after it that only repeats the end;
- empty text gives `[]`, and text no longer than `size` is a single chunk;
- `size` must be positive and `overlap` from 0 to `size - 1`; anything else raises `ValueError`.

```python
chunk_fixed("Invoice numbers are sequential and never repeat.", size=20, overlap=6)
# ['Invoice numbers are ', 's are sequential and', 'al and never repeat.']
```
