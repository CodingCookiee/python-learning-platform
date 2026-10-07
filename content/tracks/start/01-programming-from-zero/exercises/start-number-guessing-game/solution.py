import random


def hint(secret, guess):
    if guess < secret:
        return "higher"
    elif guess > secret:
        return "lower"
    else:
        return "correct"


secret = random.randint(1, 20)
guesses = 0
result = ""

while result != "correct":
    guess = int(input("Guess a number from 1 to 20: "))
    guesses += 1
    result = hint(secret, guess)
    print(result)

print("You win! Guesses:", guesses)
