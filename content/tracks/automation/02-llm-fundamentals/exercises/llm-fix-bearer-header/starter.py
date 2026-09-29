import httpx


def ask_gpt(http, question, *, api_key, model):
    """Send one question to OpenAI's Chat Completions API and return the reply text."""
    response = http.post(
        "/v1/chat/completions",
        headers={"x-api-key": api_key},
        json={"model": model, "messages": [{"role": "user", "content": question}]},
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
