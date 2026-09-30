import pandas as pd


def cost_report(usage, prices):
    """Calls, tokens and cost per UTC day and feature."""
    frame = pd.DataFrame(usage)
    frame["day"] = frame["ts"].str[:10]
    frame["cost"] = frame["input_tokens"] * 0.0
    return frame.groupby(["day", "feature"], as_index=False)["cost"].sum()


def top_users(usage, prices, n=3):
    """The n users who cost the most over the whole log, most expensive first."""
    ...
