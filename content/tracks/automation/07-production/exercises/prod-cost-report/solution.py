import pandas as pd


def priced_usage(usage: list[dict], prices: dict) -> pd.DataFrame:
    """One row per call, with its UTC day and its cost in dollars."""
    frame = pd.DataFrame(usage)
    missing = sorted(set(frame["model"]) - set(prices))
    if missing:
        raise ValueError(f"No price for {', '.join(missing)}")
    frame["day"] = pd.to_datetime(frame["ts"], utc=True).dt.strftime("%Y-%m-%d")
    input_price = frame["model"].map(lambda model: prices[model]["input"])
    output_price = frame["model"].map(lambda model: prices[model]["output"])
    frame["cost"] = (frame["input_tokens"] * input_price + frame["output_tokens"] * output_price) / 1_000_000
    return frame


def cost_report(usage: list[dict], prices: dict) -> pd.DataFrame:
    """Calls, tokens and cost per UTC day and feature."""
    frame = priced_usage(usage, prices)
    report = (
        frame.groupby(["day", "feature"], as_index=False)
        .agg(
            calls=("model", "size"),
            input_tokens=("input_tokens", "sum"),
            output_tokens=("output_tokens", "sum"),
            cost=("cost", "sum"),
        )
        .sort_values(["day", "cost"], ascending=[True, False])
        .reset_index(drop=True)
    )
    report["cost"] = report["cost"].round(4)
    return report


def top_users(usage: list[dict], prices: dict, n: int = 3) -> list[tuple[str, float]]:
    """The n users who cost the most over the whole log, most expensive first."""
    totals = priced_usage(usage, prices).groupby("user")["cost"].sum().sort_values(ascending=False)
    return [(user, round(float(cost), 4)) for user, cost in totals.head(n).items()]
