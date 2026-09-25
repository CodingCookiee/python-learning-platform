Write `leaderboard(scores, *, top=None)` where `scores` maps each player's name to their points. It
returns the names from most points to fewest. Players with equal points are listed alphabetically.
If `top` is given, only the first `top` names are returned.

```python
scores = {"mo": 40, "ada": 55, "kim": 40, "sam": 12}

leaderboard(scores)            # ["ada", "kim", "mo", "sam"]
leaderboard(scores, top=2)     # ["ada", "kim"]
```
