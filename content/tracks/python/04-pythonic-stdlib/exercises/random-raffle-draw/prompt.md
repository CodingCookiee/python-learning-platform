A charity raffle gives each entrant some tickets. Write `draw_winners(tickets, k, rng)` that draws
`k` different winners, in the order they're drawn:

- `tickets` maps each name to how many tickets they bought, like `{"ada": 3, "grace": 1}`.
- Each draw is weighted by tickets: someone with 3 tickets is three times as likely to win it as
  someone with 1. Nobody can win twice.
- `rng` is a `random.Random`. Use it for every random choice, so that a seeded generator gives
  the same result every time.

```python
import random

tickets = {"ada": 3, "grace": 1, "linus": 2, "guido": 5}
draw_winners(tickets, 2, random.Random(7)) == draw_winners(tickets, 2, random.Random(7))   # True
```

Raise `ValueError` if `k` is more than the number of entrants, and leave `tickets` unchanged.
