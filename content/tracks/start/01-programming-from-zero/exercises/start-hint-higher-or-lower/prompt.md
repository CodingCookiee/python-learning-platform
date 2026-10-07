In a number-guessing game, the computer picks a secret number and the player tries to guess it. After
each guess, the game gives a hint. Write `hint(secret, guess)` that **returns** one of three words:

| When | Return |
|------|--------|
| the secret is higher than the guess | `"higher"` |
| the secret is lower than the guess | `"lower"` |
| the guess is the secret | `"correct"` |

For example, when the secret is 12:

| Call | Returns |
|------|---------|
| `hint(12, 5)` | `"higher"` |
| `hint(12, 18)` | `"lower"` |
| `hint(12, 12)` | `"correct"` |

Return the word exactly as shown, in lowercase, and don't print anything. In the next drill, your game
will print it.
