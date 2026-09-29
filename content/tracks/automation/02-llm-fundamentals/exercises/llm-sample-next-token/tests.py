import random
from collections import Counter

from plp import hidden, raises, test
from solution import sample_next_token, token_probabilities

LOGITS = {"shipped": 2.0, "delayed": 1.0, "lost": 0.0}


def rounded(probabilities):
    return {token: round(p, 3) for token, p in probabilities.items()}


def draws(n, **kwargs):
    rng = random.Random(2026)
    return Counter(sample_next_token(LOGITS, rng=rng, **kwargs) for _ in range(n))


@test("Computes probabilities and samples, like the example")
def _():
    assert rounded(token_probabilities(LOGITS, 1.0)) == {"shipped": 0.665, "delayed": 0.245, "lost": 0.09}
    assert sample_next_token(LOGITS, temperature=0, rng=random.Random(1)) == "shipped"
    assert sample_next_token(LOGITS, temperature=1.0, top_p=0.5, rng=random.Random(1)) == "shipped"


@test("Temperature sharpens or flattens the probabilities, in the same key order")
def _():
    assert rounded(token_probabilities(LOGITS, 0.5)) == {"shipped": 0.867, "delayed": 0.117, "lost": 0.016}
    assert rounded(token_probabilities(LOGITS, 4.0)) == {"shipped": 0.419, "delayed": 0.326, "lost": 0.254}
    assert list(token_probabilities({"b": 1.0, "a": 2.0}, 1.0)) == ["b", "a"]
    assert round(sum(token_probabilities(LOGITS, 0.7).values()), 9) == 1


@test("Temperature 0 always picks the top token, the first on a tie")
def _():
    assert set(draws(50, temperature=0)) == {"shipped"}
    assert sample_next_token({"delayed": 1.5, "shipped": 1.5}, temperature=0, rng=random.Random(3)) == "delayed"


@test("Samples in proportion to the probabilities", timeout=5)
def _():
    counts = draws(3000, temperature=1.0)
    shares = {token: counts[token] / 3000 for token in LOGITS}
    assert 0.62 < shares["shipped"] < 0.71, f"'shipped' should be picked about 66.5% of the time, got {shares}"
    assert 0.21 < shares["delayed"] < 0.28, f"'delayed' should be picked about 24.5% of the time, got {shares}"
    assert 0.06 < shares["lost"] < 0.12, f"'lost' should be picked about 9% of the time, got {shares}"


@test("top_p keeps only the smallest set of likely tokens", timeout=5)
def _():
    assert set(draws(500, temperature=1.0, top_p=0.9)) == {"shipped", "delayed"}
    assert set(draws(200, temperature=1.0, top_p=0.665)) == {"shipped"}
    assert set(draws(500, temperature=1.0, top_p=1.0)) == {"shipped", "delayed", "lost"}


@hidden("Handles large logits without overflowing")
def _():
    probabilities = token_probabilities({"refund": 1000.0, "replace": 999.0}, 1.0)
    assert rounded(probabilities) == {"refund": 0.731, "replace": 0.269}


@hidden("Refuses a negative temperature and an out-of-range top_p")
def _():
    raises(ValueError, sample_next_token, LOGITS, temperature=-0.1, rng=random.Random(1))
    raises(ValueError, sample_next_token, LOGITS, temperature=1.0, top_p=0, rng=random.Random(1))
    raises(ValueError, sample_next_token, LOGITS, temperature=1.0, top_p=1.5, rng=random.Random(1))
