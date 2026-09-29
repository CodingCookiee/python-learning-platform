Castlegate Legal's bot asks the model to cite its sources by number in square brackets. Write
`parse_citations(answer)`, which returns the source numbers an answer cites, as a list of ints.

- A citation is a number in square brackets, `[2]`, or several separated by commas, `[1, 3]`.
  Citations can sit next to each other: `[2][3]`.
- Return each number once, in the order it first appears.
- Ignore brackets that don't hold only numbers (`[see below]`, `[1a]`) and the number 0, since
  sources are numbered from 1.

```python
parse_citations("You have 30 days [1]. You can claim up to three times the deposit [2, 1][4].")
# [1, 2, 4]
```
