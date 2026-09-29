REPLY_SYSTEM = (
    "You draft replies to customer emails for Harbour Bikes support. Be friendly and concise. "
    "Never promise refunds, discounts or delivery dates: a person decides those."
)


def draft_reply(llm, email):
    """A draft reply to a customer email, for a support agent to review."""
    system = REPLY_SYSTEM + "\n\nCustomer email:\n" + email
    reply = llm.complete([{"role": "user", "content": "Draft a reply to the customer email."}], system=system, max_tokens=400)
    return reply.text
