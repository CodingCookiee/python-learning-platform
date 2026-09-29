import timeit

calls = {"setup": 0, "statement": 0}


def load_prices():
    calls["setup"] += 1


def price_lookup():
    calls["statement"] += 1


timeit.timeit(price_lookup, setup=load_prices, number=50)
print(calls)

timings = timeit.repeat(price_lookup, setup=load_prices, number=10, repeat=3)
print(calls)
print(len(timings), type(timings[0]).__name__)
