from functools import lru_cache

RATES = {"EUR": 1.17, "USD": 1.27, "GBP": 1.0}


@lru_cache(maxsize=2)
def exchange_rate(currency):
    print("fetch", currency)
    return RATES[currency]


for currency in ["EUR", "USD", "EUR", "GBP", "USD", "EUR"]:
    exchange_rate(currency)

info = exchange_rate.cache_info()
print(f"hits={info.hits} misses={info.misses} size={info.currsize}")
