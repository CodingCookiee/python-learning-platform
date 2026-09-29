import httpx

SYSTEM = (
    "You summarise customer support tickets for the on-call engineer. "
    "Reply with one sentence of at most 20 words. Include the order number if there is one."
)


def summarise_ticket(http, ticket, *, api_key, model):
    """A one-sentence summary of a support ticket, from Anthropic's Messages API."""
    response = http.post(
        "/v1/messages",
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        json={
            "model": model,
            "max_tokens": 100,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": ticket},
            ],
        },
    )
    response.raise_for_status()
    return response.json()["content"][0]["text"]
