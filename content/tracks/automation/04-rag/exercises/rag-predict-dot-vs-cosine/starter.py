import numpy as np

query = np.array([1.0, 1.0, 0.0])
short_chunk = np.array([1.0, 1.0, 0.0])
long_page = np.array([4.0, 3.0, 5.0])


def cosine(a, b):
    return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))


print("dot:", query @ short_chunk, query @ long_page)
print("cosine:", round(cosine(query, short_chunk), 2), round(cosine(query, long_page), 2))

unit_query = query / np.linalg.norm(query)
unit_page = long_page / np.linalg.norm(long_page)
print("length:", round(np.linalg.norm(unit_page), 2))
print("dot of units:", round(unit_query @ unit_page, 2))
