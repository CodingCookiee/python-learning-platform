import httpx

ANTHROPIC_VERSION = "2023-06-01"


def ask_claude(http, question, *, api_key, model):
    """Send one question to Anthropic's Messages API and return the reply text."""
    response = http.post(
        "/v1/messages",
        headers={"x-api-key": api_key, "anthropic-version": ANTHROPIC_VERSION},
        json={
            "model": model,
            "max_tokens": 500,
            "messages": [{"role": "user", "content": question}],
        },
    )
    response.raise_for_status()
    return response.json()["content"][0]["text"]
