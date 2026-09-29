LABELS = ("hot", "warm", "cold")

LEAD_SYSTEM = (
    "You score inbound sales enquiries for Harbour Bikes' business team. "
    "hot: a clear need, a quantity or budget, and a timeframe. "
    "warm: a real interest but no timeframe or budget yet. "
    "cold: browsing, students, job seekers, or anything that isn't a purchase. "
    "Reply with exactly one word: hot, warm or cold."
)


def lead_messages(lead, examples):
    """The few-shot conversation: each example as a user/assistant pair, then the new lead."""
    ...


def classify_lead(llm, lead, examples):
    """hot, warm or cold, or "unknown" when the model's answer isn't one of them."""
    ...
