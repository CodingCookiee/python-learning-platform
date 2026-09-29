import pandas as pd

COLUMNS = ["week", "applied", "responses", "interviews", "offers", "response_rate"]


def weekly_summary(conn):
    """A CSV report, one row per week (every week from the first to the last), as a string."""
    apps = pd.read_sql_query("SELECT applied_on, status FROM applications", conn, parse_dates=["applied_on"])
    if apps.empty:
        return pd.DataFrame(columns=COLUMNS).to_csv(index=False)
    apps = apps.assign(
        week=apps["applied_on"].dt.to_period("W").dt.start_time,
        responded=apps["status"] != "applied",
        interviewed=apps["status"].isin(["interview", "offer"]),
        offered=apps["status"] == "offer",
    )
    weekly = apps.groupby("week").agg(
        applied=("status", "size"),
        responses=("responded", "sum"),
        interviews=("interviewed", "sum"),
        offers=("offered", "sum"),
    )
    every_week = pd.date_range(weekly.index.min(), weekly.index.max(), freq="7D")
    weekly = weekly.reindex(every_week, fill_value=0)
    weekly["response_rate"] = (weekly["responses"] / weekly["applied"] * 100).round(1).fillna(0.0)
    weekly.index = weekly.index.strftime("%Y-%m-%d")
    weekly.index.name = "week"
    return weekly.reset_index()[COLUMNS].to_csv(index=False)
