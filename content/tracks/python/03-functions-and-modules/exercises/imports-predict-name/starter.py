import math
import random as rnd
from pathlib import Path
from math import floor as round_down

print(__name__)
print(math.__name__, rnd.__name__)
print(Path("invoices/2026-09.pdf").suffix)
print(round_down(9.99), math.ceil(9.01))
print(round_down is math.floor)


def main():
    print("running main")


if __name__ == "__main__":
    main()
print("done")
