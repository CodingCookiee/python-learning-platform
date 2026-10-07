Time for the finale. Write a number-guessing game: the computer picks a secret number from 1 to 20, and
the player keeps guessing until they get it.

Your program must:

1. Pick the secret number with `random.randint(1, 20)`. The `import random` line is already at the top.
2. Use the `hint` function to decide what to say. It's already in the starting code, just like the one
   you wrote in the last drill.
3. In a `while` loop, ask for a guess with `input()`, turn it into a whole number with `int()`, and
   print the hint for that guess. Keep going until the hint is `correct`.
4. After the loop, print `You win! Guesses:` followed by the number of guesses the player took.

Here's a game where the secret number was 12:

```text
Guess a number from 1 to 20: 10
higher
Guess a number from 1 to 20: 15
lower
Guess a number from 1 to 20: 12
correct
You win! Guesses: 3
```

Put the question inside `input()` rather than printing it, so that the only lines your program prints
are the hints and the last line.

**How it's tested:** the tests decide what `random.randint(1, 20)` hands back, so they know the secret
number and can play a whole game by typing in guesses. That's why your program must pick the secret
with `random.randint(1, 20)`, once, before the loop.
