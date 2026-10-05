from datetime import date

from sqlalchemy.orm import Session

from conftest import add_application, add_company, add_stage
from jobtracker.report import REPORT_COLUMNS, weekly_report


async def test_empty_weeks_appear(engine):
    with Session(engine) as session:
        df = weekly_report(session, date(2026, 10, 2), weeks=3)
    assert list(df.columns) == REPORT_COLUMNS
    assert [str(week) for week in df["week"]] == ["2026-09-14", "2026-09-21", "2026-09-28"]
    assert df["applied"].sum() == 0 and df["response_rate"].sum() == 0.0


async def test_withdrawn_is_not_a_response(client, engine):
    await add_company(client)
    await add_application(client, applied_on="2026-09-29")
    await add_application(client, applied_on="2026-09-30")
    await client.patch("/applications/2", json={"status": "withdrawn"})
    with Session(engine) as session:
        df = weekly_report(session, date(2026, 10, 2), weeks=1)
    assert df.iloc[0]["applied"] == 2 and df.iloc[0]["responses"] == 0


async def test_stage_counts_in_the_week_it_is_scheduled(client, engine):
    await add_company(client)
    await add_application(client, applied_on="2026-09-15")
    await add_stage(client, 1, "2026-09-29T10:00:00")
    with Session(engine) as session:
        df = weekly_report(session, date(2026, 10, 2), weeks=3)
    assert list(df["stages"]) == [0, 0, 1]
    assert list(df["interviews"]) == [1, 0, 0]
    assert list(df["response_rate"]) == [100.0, 0.0, 0.0]


async def test_csv_endpoint(client):
    await add_company(client)
    await add_application(client, applied_on="2026-09-29")
    response = await client.get("/reports/weekly.csv", params={"today": "2026-10-02", "weeks": 1})
    assert response.headers["content-type"].startswith("text/csv")
    assert response.text.splitlines() == [",".join(REPORT_COLUMNS), "2026-09-28,1,0,0,0,0.0,0"]


async def test_json_endpoint(client):
    response = await client.get("/reports/weekly", params={"today": "2026-10-02", "weeks": 2})
    assert [row["week"] for row in response.json()] == ["2026-09-21", "2026-09-28"]


async def test_weeks_must_be_positive(client):
    assert (await client.get("/reports/weekly", params={"weeks": 0})).status_code == 422
