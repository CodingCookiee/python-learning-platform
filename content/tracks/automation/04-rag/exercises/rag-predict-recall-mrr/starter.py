retrieved = {
    "q1": ["fees#0", "fees#1", "cancellations#0"],
    "q2": ["parking#0", "cancellations#1", "cancellations#0"],
    "q3": ["insurance#0", "fees#0", "parking#0"],
}
relevant = {"q1": {"fees#1"}, "q2": {"cancellations#0", "cancellations#1"}, "q3": {"hours#0"}}

for k in (1, 2, 3):
    scores = [len(relevant[q] & set(retrieved[q][:k])) / len(relevant[q]) for q in retrieved]
    print(f"recall@{k}:", [round(s, 2) for s in scores], round(sum(scores) / len(scores), 2))

ranks = []
for q, results in retrieved.items():
    first = next((rank for rank, chunk in enumerate(results, start=1) if chunk in relevant[q]), None)
    ranks.append(first)
print("first relevant rank:", ranks)
print("MRR:", round(sum(1 / r for r in ranks if r) / len(ranks), 2))
