import json

RERANK_SYSTEM = (
    "You rank passages by how well they answer the question. "
    'Reply with JSON only, in the form {"ranking": [passage numbers, most relevant first]}.'
)


def _model_order(text, count):
    try:
        ranking = json.loads(text).get("ranking")
    except (ValueError, AttributeError):
        return []
    if not isinstance(ranking, list):
        return []
    order = []
    for n in ranking:
        if type(n) is int and 1 <= n <= count and n not in order:
            order.append(n)
    return order


def rerank(llm, question, candidates, top_n=3):
    """The top_n candidates, reordered by the model's ranking."""
    if len(candidates) <= 1:
        return list(candidates[:top_n])
    passages = "\n\n".join(f"[{n}] {chunk['text']}" for n, chunk in enumerate(candidates, start=1))
    response = llm.complete(
        [{"role": "user", "content": f"Question: {question}\n\n{passages}"}],
        system=RERANK_SYSTEM,
        temperature=0,
    )
    order = _model_order(response.text, len(candidates))
    order += [n for n in range(1, len(candidates) + 1) if n not in order]
    return [candidates[n - 1] for n in order[:top_n]]
