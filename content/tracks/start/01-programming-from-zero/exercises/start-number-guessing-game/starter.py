import random


def hint(secret, guess):
    if guess < secret:
        return "higher"
    elif guess > secret:
        return "lower"
    else:
        return "correct"


# 1. Pick the secret number, from 1 to 20


# 2. Keep asking for guesses until the hint is "correct".
#    Print the hint after each guess, and count the guesses.


# 3. Print how many guesses it took
