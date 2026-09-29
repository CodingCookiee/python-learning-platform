results = [  # (office, chunk id, score), best first
    ("new-york", "pto#0", 0.91),
    ("new-york", "pto#1", 0.88),
    ("london", "leave#0", 0.84),
    ("new-york", "pto#2", 0.80),
    ("london", "leave#1", 0.61),
    ("london", "leave#2", 0.58),
]


def search(office, k, candidates):
    pool = results[:candidates]
    return [chunk for where, chunk, _ in pool if where == office][:k]


print(search("london", k=3, candidates=3))
print(search("london", k=3, candidates=6))
print(search("new-york", k=2, candidates=3))
print(search("london", k=2, candidates=5))
