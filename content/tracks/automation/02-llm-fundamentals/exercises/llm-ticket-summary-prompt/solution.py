SUMMARY_SYSTEM = (
    "You summarise customer support tickets for Harbour Bikes' on-call engineer. "
    "Write one sentence of at most 20 words: the problem, the order number if there is one, "
    "and what the customer wants. Don't add anything the ticket doesn't say."
)


def summarise_ticket(llm, ticket):
    """A one-line summary of a support ticket."""
    message = {"role": "user", "content": f"<ticket>\n{ticket}\n</ticket>"}
    reply = llm.complete([message], system=SUMMARY_SYSTEM, max_tokens=100, temperature=0)
    return reply.text.strip()
