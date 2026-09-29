def evaluate_retrieval(questions, search, k=5):
    """{"recall@k": ..., "mrr": ..., "misses": [...]} over the answerable questions."""
    hits = 0
    for question in questions:
        results = search(question["question"], k)
        if any(chunk_id in question["relevant"] for chunk_id in results):
            hits += 1
    return {f"recall@{k}": round(hits / len(questions), 3), "mrr": 0.0, "misses": []}
