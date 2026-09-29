import random

scores = {"shipped": 4.0, "delayed": 2.0, "lost": 1.0}


def scaled(scores, temperature):
    return {token: score / temperature for token, score in scores.items()}


def greedy(scores):
    return max(scores, key=scores.get)


for temperature in (0.5, 1.0, 2.0):
    s = scaled(scores, temperature)
    print(temperature, s["shipped"] - s["delayed"], greedy(s))

picks = [random.Random(42).choice(["shipped", "delayed", "lost"]) for _ in range(3)]
print(len(set(picks)))
