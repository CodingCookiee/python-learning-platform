def hint(secret, guess):
    if guess < secret:
        return "higher"
    elif guess > secret:
        return "lower"
    else:
        return "correct"
