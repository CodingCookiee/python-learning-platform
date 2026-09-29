import sys

short_notes = ["Paid"]
long_notes = ["Paid in full by bank transfer, reference INV-0001. " * 100]
print(sys.getsizeof(short_notes) == sys.getsizeof(long_notes))

print(sys.getsizeof(range(10)) == sys.getsizeof(range(10_000_000)))

squares = [n * n for n in range(1_000)]
lazy_squares = (n * n for n in range(1_000))
print(sys.getsizeof(squares) > sys.getsizeof(lazy_squares))

print(sum(lazy_squares) == sum(lazy_squares))
print(len(squares), sum(1 for _ in lazy_squares))
