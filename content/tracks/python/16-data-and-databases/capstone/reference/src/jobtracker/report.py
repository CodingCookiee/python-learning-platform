"""The weekly report: SQL fetches the rows in the window, pandas does the rest."""

from datetime import date, datetime, time, timedelta

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from jobtracker.models import Application, Stage

REPORT_COLUMNS = ["week", "applied", "responses", "interviews", "offers", "response_rate", "stages"]
NO_RESPONSE = ("applied", "withdrawn")
OFFERS = ("offer", "accepted")


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def weekly_report(session: Session, today: date, weeks: int = 4) -> pd.DataFrame:
    """One row per week (weeks start on Monday) for the `weeks` weeks ending with the one that
    contains `today`, oldest first, with the columns in REPORT_COLUMNS."""
    first = monday_of(today) - timedelta(weeks=weeks - 1)
    end = monday_of(today) + timedelta(weeks=1)
    mondays = [first + timedelta(weeks=n) for n in range(weeks)]

    applications = pd.read_sql_query(
        select(Application.id, Application.applied_on, Application.status, func.count(Stage.id).label("stage_count"))
        .outerjoin(Application.stages)
        .where(Application.applied_on >= first, Application.applied_on < end)
        .group_by(Application.id),
        session.connection(),
    )
    stages = pd.read_sql_query(
        select(Stage.scheduled_at).where(
            Stage.scheduled_at >= datetime.combine(first, time()),
            Stage.scheduled_at < datetime.combine(end, time()),
        ),
        session.connection(),
    )

    applications["week"] = [monday_of(pd.Timestamp(day).date()) for day in applications["applied_on"]]
    applications["responded"] = ~applications["status"].isin(NO_RESPONSE)
    applications["interviewed"] = applications["responded"] & (applications["stage_count"] > 0)
    applications["offered"] = applications["interviewed"] & applications["status"].isin(OFFERS)
    sent = (
        applications.groupby("week")
        .agg(
            applied=("id", "count"),
            responses=("responded", "sum"),
            interviews=("interviewed", "sum"),
            offers=("offered", "sum"),
        )
        .reindex(mondays, fill_value=0)
    )
    stage_weeks = pd.Series([monday_of(pd.Timestamp(at).date()) for at in stages["scheduled_at"]], dtype=object)
    scheduled = stage_weeks.value_counts().reindex(mondays, fill_value=0)

    report = pd.DataFrame({"week": mondays})
    for column in ("applied", "responses", "interviews", "offers"):
        report[column] = sent[column].astype(int).to_numpy()
    rate = report["responses"] * 100 / report["applied"].where(report["applied"] > 0)
    report["response_rate"] = rate.round(1).fillna(0.0)
    report["stages"] = scheduled.astype(int).to_numpy()
    return report[REPORT_COLUMNS]
