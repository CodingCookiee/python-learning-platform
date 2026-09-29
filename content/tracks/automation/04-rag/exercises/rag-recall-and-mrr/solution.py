def evaluate_retrieval(questions, search, k=5):
    """{"recall@k": ..., "mrr": ..., "misses": [...]} over the answerable questions."""
    answerable = [q for q in questions if q["relevant"]]
    if not answerable:
        raise ValueError("no answerable questions to evaluate")
    recalls, reciprocal_ranks, misses = [], [], []
    for q in answerable:
        wanted = set(q["relevant"])
        results = list(search(q["question"], k))[:k]
        recalls.append(len(wanted & set(results)) / len(wanted))
        rank = next((r for r, chunk_id in enumerate(results, start=1) if chunk_id in wanted), None)
        reciprocal_ranks.append(1 / rank if rank else 0.0)
        if rank is None:
            misses.append(q["id"])
    return {
        f"recall@{k}": round(sum(recalls) / len(recalls), 3),
        "mrr": round(sum(reciprocal_ranks) / len(reciprocal_ranks), 3),
        "misses": misses,
    }
