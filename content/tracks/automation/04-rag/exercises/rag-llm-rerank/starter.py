import json

RERANK_SYSTEM = (
    "You rank passages by how well they answer the question. "
    'Reply with JSON only, in the form {"ranking": [passage numbers, most relevant first]}.'
)


def rerank(llm, question, candidates, top_n=3):
    """The top_n candidates, reordered by the model's ranking."""
    passages = "\n".join(chunk["text"] for chunk in candidates)
    response = llm.complete([{"role": "user", "content": f"{question}\n{passages}"}])
    ranking = json.loads(response.text)["ranking"]
    return [candidates[n] for n in ranking][:top_n]
