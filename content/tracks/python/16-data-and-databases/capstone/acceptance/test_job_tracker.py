"""Acceptance tests for the job tracker, run by GitHub Actions in your repository.

They import your jobtracker package, build an app with create_app around a fresh in-memory
SQLite database for every test, and send it requests in-process over httpx.ASGITransport.
They also run your migrations on an empty database, and your own test suite.
"""

import asyncio
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

import httpx
import pytest
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

REPORT_COLUMNS = ["week", "applied", "responses", "interviews", "offers", "response_rate", "stages"]

SAMPLE_CSV = """\
week,applied,responses,interviews,offers,response_rate,stages
2026-08-31,3,2,1,1,66.7,0
2026-09-07,2,1,1,0,50.0,1
2026-09-14,0,0,0,0,0.0,2
2026-09-21,2,1,1,0,50.0,1
2026-09-28,0,0,0,0,0.0,1
"""

COMPANIES = [
    {"id": 2, "name": "Globex", "website": None, "applications": 2, "active": 1},
    {"id": 4, "name": "Hooli", "website": None, "applications": 1, "active": 1},
    {"id": 3, "name": "Initech", "website": None, "applications": 1, "active": 1},
    {"id": 1, "name": "Northwind", "website": "https://northwind.example", "applications": 2, "active": 2},
    {"id": 5, "name": "Umbrella", "website": None, "applications": 1, "active": 0},
]

FIRST_STAGE = {
    "id": 1, "company_id": 1, "company": "Northwind", "role": "Backend engineer", "source": "referral",
    "status": "interviewing", "applied_on": "2026-09-01", "salary_min": 70000, "salary_max": 80000, "notes": "",
    "stages": [{"id": 1, "kind": "phone screen", "scheduled_at": "2026-09-08T10:00:00", "outcome": "pending", "notes": ""}],
}

APPLICATIONS = [
    # company id, role, source, applied on, salary range
    (1, "Backend engineer", "referral", "2026-09-01", (70000, 80000)),
    (2, "Data engineer", "job board", "2026-09-02", None),
    (3, "Python developer", "job board", "2026-09-04", None),
    (4, "Platform engineer", "recruiter", "2026-09-10", None),
    (5, "SRE", "job board", "2026-09-11", None),
    (1, "Data platform engineer", "direct", "2026-09-22", None),
    (2, "Analytics engineer", "referral", "2026-09-23", None),
]


class AppClient:
    """A small synchronous client that sends requests to an app in-process, over ASGITransport."""

    def __init__(self, app):
        self.runner = asyncio.Runner()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    def close(self):
        self.runner.run(self.client.aclose())
        self.runner.close()

    def request(self, method, url, **options):
        return self.runner.run(self.client.request(method, url, **options))

    def get(self, url, **options):
        return self.request("GET", url, **options)

    def post(self, url, **options):
        return self.request("POST", url, **options)

    def patch(self, url, **options):
        return self.request("PATCH", url, **options)

    def delete(self, url, **options):
        return self.request("DELETE", url, **options)


@pytest.fixture(scope="module")
def jobtracker():
    try:
        import jobtracker
    except ImportError as error:
        pytest.fail(f"Couldn't import the jobtracker package ({error}). It should be in src/jobtracker/, "
                    "with a [build-system] in pyproject.toml so it installs")
    for name in ("Base", "create_app"):
        assert hasattr(jobtracker, name), f"jobtracker/__init__.py should export {name}"
    return jobtracker


@pytest.fixture
def engine(jobtracker):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    jobtracker.Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def client(jobtracker, engine):
    client = AppClient(jobtracker.create_app(engine))
    yield client
    client.close()


def ok(response, status=200):
    assert response.status_code == status, (
        f"{response.request.method} {response.request.url.path} gave {response.status_code}, expected {status}: "
        f"{response.text[:300]}"
    )
    return response.json() if response.content and status != 204 else None


def detail(response):
    body = response.json()
    assert isinstance(body, dict) and "detail" in body, f"A refusal should have a JSON body with a detail: {response.text}"
    return body["detail"]


def scenario(client):
    """The brief's sample run, as far as the requests whose answers it shows. Returns those answers."""
    seen = {}
    seen["northwind"] = client.post("/companies", json={"name": "Northwind", "website": "https://northwind.example"})
    seen["duplicate"] = client.post("/companies", json={"name": "Northwind"})
    for name in ("Globex", "Initech", "Hooli", "Umbrella"):
        ok(client.post("/companies", json={"name": name}), 201)
    for company_id, role, source, applied_on, salary in APPLICATIONS:
        body = {"company_id": company_id, "role": role, "source": source, "applied_on": applied_on}
        if salary:
            body["salary_min"], body["salary_max"] = salary
        ok(client.post("/applications", json=body), 201)
    seen["first_stage"] = client.post("/applications/1/stages", json={"kind": "phone screen", "scheduled_at": "2026-09-08T10:00:00"})
    ok(client.post("/applications/1/stages", json={"kind": "technical", "scheduled_at": "2026-09-15T14:00:00"}), 201)
    ok(client.post("/applications/1/stages", json={"kind": "final", "scheduled_at": "2026-09-24T11:00:00"}), 201)
    ok(client.patch("/stages/1", json={"outcome": "passed"}))
    ok(client.patch("/stages/2", json={"outcome": "passed"}))
    ok(client.patch("/applications/1", json={"status": "offer"}))
    ok(client.patch("/applications/2", json={"status": "rejected"}))
    ok(client.post("/applications/4/stages", json={"kind": "phone screen", "scheduled_at": "2026-09-17T09:30:00"}), 201)
    ok(client.patch("/applications/5", json={"status": "withdrawn"}))
    ok(client.post("/applications/7/stages", json={"kind": "phone screen", "scheduled_at": "2026-09-29T16:00:00"}), 201)
    seen["refused_move"] = client.patch("/applications/2", json={"status": "interviewing"})
    seen["closed_stage"] = client.post("/applications/5/stages", json={"kind": "technical", "scheduled_at": "2026-09-30T10:00:00"})
    seen["unknown_company"] = client.post(
        "/applications", json={"company_id": 9, "role": "SRE", "source": "direct", "applied_on": "2026-09-30"}
    )
    return seen


def application(client, company_id=1, **changes):
    body = {"company_id": company_id, "role": "Engineer", "source": "direct", "applied_on": "2026-09-01", **changes}
    return ok(client.post("/applications", json=body), 201)


def company(client, name="Acme"):
    return ok(client.post("/companies", json={"name": name}), 201)


def weekly_report_function(jobtracker):
    try:
        from jobtracker.report import weekly_report
    except ImportError:
        weekly_report = getattr(jobtracker, "weekly_report", None)
    assert weekly_report is not None, "weekly_report should be in jobtracker/report.py (or exported by jobtracker)"
    return weekly_report


def test_the_sample_run_companies(client):
    seen = scenario(client)
    assert ok(seen["northwind"], 201) == {
        "id": 1, "name": "Northwind", "website": "https://northwind.example", "applications": 0, "active": 0
    }
    assert seen["duplicate"].status_code == 409
    assert seen["duplicate"].json() == {"detail": "A company called 'Northwind' already exists"}
    assert ok(client.get("/companies")) == COMPANIES
    assert ok(client.get("/companies/1")) == COMPANIES[3]
    assert client.get("/companies/9").status_code == 404 and detail(client.get("/companies/9")) == "Company 9 not found"


def test_the_sample_run_stages_and_refusals(client):
    seen = scenario(client)
    assert ok(seen["first_stage"], 201) == FIRST_STAGE
    assert seen["refused_move"].status_code == 409
    assert seen["refused_move"].json() == {"detail": "Can't move an application from rejected to interviewing"}
    assert seen["closed_stage"].status_code == 409
    assert seen["closed_stage"].json() == {"detail": "Can't add a stage to an application that is withdrawn"}
    assert seen["unknown_company"].status_code == 404
    assert seen["unknown_company"].json() == {"detail": "Company 9 not found"}
    first = ok(client.get("/applications/1"))
    assert first["status"] == "offer"
    assert [(s["kind"], s["outcome"]) for s in first["stages"]] == [
        ("phone screen", "passed"), ("technical", "passed"), ("final", "pending")
    ]
    assert ok(client.get("/applications/2"))["status"] == "rejected", "A refused request must change nothing"
    assert ok(client.get("/applications/5"))["stages"] == []


def test_the_sample_run_listing_and_sorting(client):
    scenario(client)
    listed = ok(client.get("/applications", params={"status": "interviewing", "sort": "-applied_on"}))
    assert [(a["id"], a["company"], a["role"]) for a in listed] == [
        (7, "Globex", "Analytics engineer"), (4, "Hooli", "Platform engineer")
    ]
    assert len(listed[0]["stages"]) == 1
    everything = ok(client.get("/applications"))
    assert [a["id"] for a in everything] == [1, 2, 3, 4, 5, 6, 7], "The default sort is applied_on, oldest first"
    by_company = ok(client.get("/applications", params={"sort": "company"}))
    assert [a["company"] for a in by_company] == ["Globex", "Globex", "Hooli", "Initech", "Northwind", "Northwind", "Umbrella"]
    assert [a["id"] for a in ok(client.get("/applications", params={"company_id": 2}))] == [2, 7]
    assert client.get("/applications", params={"sort": "salary"}).status_code == 422


def test_the_sample_run_weekly_report(client):
    scenario(client)
    response = client.get("/reports/weekly.csv", params={"today": "2026-10-02", "weeks": 5})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.text.replace("\r\n", "\n") == SAMPLE_CSV
    rows = ok(client.get("/reports/weekly", params={"today": "2026-10-02", "weeks": 5}))
    assert rows[0] == {"week": "2026-08-31", "applied": 3, "responses": 2, "interviews": 1, "offers": 1,
                       "response_rate": 66.7, "stages": 0}
    assert [r["week"] for r in rows] == ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]
    assert [r["stages"] for r in rows] == [0, 1, 2, 1, 1]
    this_week = ok(client.get("/reports/weekly"))
    monday = date.today().toordinal() - date.today().weekday()
    assert len(this_week) == 4 and this_week[-1]["week"] == date.fromordinal(monday).isoformat(), (
        "By default the report covers 4 weeks, ending with the week that contains today"
    )
    assert client.get("/reports/weekly", params={"weeks": 0}).status_code == 422
    assert client.get("/reports/weekly.csv", params={"today": "not-a-date"}).status_code == 422


def test_deleting_a_company_removes_its_applications_and_stages_only(client):
    scenario(client)
    assert client.delete("/companies/1").status_code == 204
    gone = client.get("/applications/1")
    assert gone.status_code == 404 and gone.json() == {"detail": "Application 1 not found"}
    assert len(ok(client.get("/applications"))) == 5
    assert client.patch("/stages/1", json={"outcome": "failed"}).status_code == 404, "Its stages should be gone too"
    assert ok(client.patch("/stages/4", json={"notes": "went well"}))["notes"] == "went well", "Other stages stay"
    assert [c["name"] for c in ok(client.get("/companies"))] == ["Globex", "Hooli", "Initech", "Umbrella"]
    assert client.delete("/companies/1").status_code == 404


def test_deleting_an_application_removes_its_stages(client):
    company(client)
    first = application(client)
    second = application(client)
    ok(client.post(f"/applications/{first['id']}/stages", json={"kind": "onsite", "scheduled_at": "2026-09-10T09:00:00"}), 201)
    ok(client.post(f"/applications/{second['id']}/stages", json={"kind": "onsite", "scheduled_at": "2026-09-11T09:00:00"}), 201)
    assert client.delete(f"/applications/{first['id']}").status_code == 204
    assert client.get(f"/applications/{first['id']}").status_code == 404
    assert client.patch("/stages/1", json={"outcome": "passed"}).status_code == 404
    assert ok(client.patch("/stages/2", json={"outcome": "passed"})) == {
        "id": 2, "kind": "onsite", "scheduled_at": "2026-09-11T09:00:00", "outcome": "passed", "notes": ""
    }
    assert client.delete(f"/applications/{first['id']}").status_code == 404
    assert ok(client.get("/companies/1"))["applications"] == 1


def test_status_transitions_follow_the_rules(client):
    company(client)
    allowed = {
        "applied": ["interviewing", "rejected", "withdrawn"],
        "interviewing": ["offer", "rejected", "withdrawn"],
        "offer": ["accepted", "rejected", "withdrawn"],
    }
    path_to = {"applied": [], "interviewing": ["interviewing"], "offer": ["interviewing", "offer"]}
    for start, targets in allowed.items():
        for target in targets:
            app_id = application(client)["id"]
            for step in path_to[start]:
                ok(client.patch(f"/applications/{app_id}", json={"status": step}))
            moved = ok(client.patch(f"/applications/{app_id}", json={"status": target}))
            assert moved["status"] == target, f"{start} -> {target} should be allowed"
    for closed in ("accepted", "rejected", "withdrawn"):
        app_id = application(client)["id"]
        for step in {"accepted": ["interviewing", "offer", "accepted"], "rejected": ["rejected"], "withdrawn": ["withdrawn"]}[closed]:
            ok(client.patch(f"/applications/{app_id}", json={"status": step}))
        refused = client.patch(f"/applications/{app_id}", json={"status": "interviewing"})
        assert refused.status_code == 409, f"{closed} -> interviewing should be refused"
        assert detail(refused) == f"Can't move an application from {closed} to interviewing"
        assert ok(client.patch(f"/applications/{app_id}", json={"status": closed}))["status"] == closed, (
            "Setting the status an application already has is allowed"
        )
    app_id = application(client)["id"]
    skipped = client.patch(f"/applications/{app_id}", json={"status": "offer"})
    assert skipped.status_code == 409 and detail(skipped) == "Can't move an application from applied to offer"
    noted = ok(client.patch(f"/applications/{app_id}", json={"notes": "chased by email"}))
    assert noted["notes"] == "chased by email" and noted["status"] == "applied"
    assert client.patch("/applications/999", json={"notes": "x"}).status_code == 404


def test_stages_move_applications_and_respect_closed_ones(client):
    company(client)
    app_id = application(client)["id"]
    later = ok(client.post(f"/applications/{app_id}/stages", json={"kind": "final", "scheduled_at": "2026-09-20T10:00:00"}), 201)
    assert later["status"] == "interviewing", "Adding a stage to an applied application moves it to interviewing"
    earlier = ok(client.post(f"/applications/{app_id}/stages", json={"kind": "phone screen", "scheduled_at": "2026-09-05T10:00:00", "notes": "30 min"}), 201)
    assert [s["kind"] for s in earlier["stages"]] == ["phone screen", "final"], "Stages are listed in scheduled order"
    assert set(earlier["stages"][0]) == {"id", "kind", "scheduled_at", "outcome", "notes"}
    ok(client.patch(f"/applications/{app_id}", json={"status": "offer"}))
    refused = client.post(f"/applications/{app_id}/stages", json={"kind": "onsite", "scheduled_at": "2026-09-25T10:00:00"})
    assert refused.status_code == 409 and detail(refused) == "Can't add a stage to an application that is offer"
    assert len(ok(client.get(f"/applications/{app_id}"))["stages"]) == 2, "A refused request must change nothing"
    assert client.post("/applications/999/stages", json={"kind": "onsite", "scheduled_at": "2026-09-25T10:00:00"}).status_code == 404
    assert client.post(f"/applications/{app_id}/stages", json={"kind": "lunch", "scheduled_at": "2026-09-25T10:00:00"}).status_code == 422
    missing = client.patch("/stages/999", json={"outcome": "passed"})
    assert missing.status_code == 404 and detail(missing)
    assert client.patch("/stages/1", json={"outcome": "great"}).status_code == 422


def test_invalid_bodies_are_422(client):
    company(client)
    base = {"company_id": 1, "role": "Engineer", "source": "direct", "applied_on": "2026-09-01"}
    for change in ({"salary_min": 90000, "salary_max": 80000}, {"source": "newspaper"}, {"role": ""},
                   {"role": "x" * 101}, {"applied_on": "yesterday"}):
        response = client.post("/applications", json={**base, **change})
        assert response.status_code == 422, f"{change} should be refused with 422"
    assert ok(client.post("/applications", json={**base, "salary_min": 80000, "salary_max": 80000}), 201)["salary_max"] == 80000
    assert client.post("/companies", json={"name": ""}).status_code == 422
    assert client.post("/companies", json={"name": "x" * 101}).status_code == 422
    assert client.patch("/applications/1", json={"status": "ghosted"}).status_code == 422
    assert len(ok(client.get("/applications"))) == 1, "Refused requests must create nothing"


def test_query_counts_dont_grow_with_rows(jobtracker):
    def statements(rows):
        engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        jobtracker.Base.metadata.create_all(engine)
        client = AppClient(jobtracker.create_app(engine))
        try:
            for n in range(rows):
                company_id = company(client, f"Company {n:02}")["id"]
                app_id = application(client, company_id)["id"]
                for day in (10, 11):
                    ok(client.post(f"/applications/{app_id}/stages", json={"kind": "onsite", "scheduled_at": f"2026-09-{day}T09:00:00"}), 201)
            seen = {}
            for path in ("/companies", "/applications"):
                sql = []
                listener = lambda conn, cursor, statement, *rest: sql.append(statement)  # noqa: E731
                event.listen(engine, "before_cursor_execute", listener)
                body = ok(client.get(path))
                event.remove(engine, "before_cursor_execute", listener)
                assert len(body) == rows
                seen[path] = len(sql)
            return seen
        finally:
            client.close()

    small, large = statements(3), statements(30)
    assert small["/companies"] == large["/companies"], (
        f"GET /companies ran {small['/companies']} queries for 3 companies but {large['/companies']} for 30"
    )
    assert small["/applications"] == large["/applications"], (
        f"GET /applications ran {small['/applications']} queries for 3 applications but {large['/applications']} for 30"
    )


def test_weekly_report_directly(jobtracker, engine, client):
    weekly_report = weekly_report_function(jobtracker)
    with Session(engine) as session:
        empty = weekly_report(session, date(2026, 10, 2), 3)
    assert list(empty.columns) == REPORT_COLUMNS
    assert len(empty) == 3 and empty["applied"].sum() == 0 and empty["response_rate"].sum() == 0.0
    scenario(client)
    with Session(engine) as session:
        report = weekly_report(session, date(2026, 10, 2), 5)
        one = weekly_report(session, date(2026, 9, 23), weeks=1)
    assert list(report.columns) == REPORT_COLUMNS
    assert report.to_csv(index=False).replace("\r\n", "\n") == SAMPLE_CSV
    assert len(one) == 1 and str(one["week"].iloc[0])[:10] == "2026-09-21"
    assert [int(one[c].iloc[0]) for c in ("applied", "responses", "interviews", "offers", "stages")] == [2, 1, 1, 0, 1]


def test_weekly_report_counts_a_funnel(jobtracker, engine, client):
    weekly_report = weekly_report_function(jobtracker)
    company(client)
    # Interviewed, then withdrawn: not a response, so not an interview either
    withdrawn = application(client, applied_on="2026-09-08")["id"]
    ok(client.post(f"/applications/{withdrawn}/stages", json={"kind": "phone screen", "scheduled_at": "2026-09-10T10:00:00"}), 201)
    ok(client.patch(f"/applications/{withdrawn}", json={"status": "withdrawn"}))
    # Moved to offer without a stage: a response, but not an interview or an offer
    no_stage = application(client, applied_on="2026-09-08")["id"]
    ok(client.patch(f"/applications/{no_stage}", json={"status": "interviewing"}))
    ok(client.patch(f"/applications/{no_stage}", json={"status": "offer"}))
    # Through a stage to an offer: counted in every column
    offered = application(client, applied_on="2026-09-09")["id"]
    ok(client.post(f"/applications/{offered}/stages", json={"kind": "final", "scheduled_at": "2026-09-11T15:00:00"}), 201)
    ok(client.patch(f"/applications/{offered}", json={"status": "offer"}))
    with Session(engine) as session:
        week = weekly_report(session, date(2026, 9, 9), weeks=1)
    got = {c: int(week[c].iloc[0]) for c in ("applied", "responses", "interviews", "offers", "stages")}
    assert got == {"applied": 3, "responses": 2, "interviews": 1, "offers": 1, "stages": 2}, (
        f"The report counted {got}. Each column counts only applications in the column before it: a withdrawn "
        "application isn't a response even after an interview, and an offer without a stage isn't an interview or an offer."
    )
    assert float(week["response_rate"].iloc[0]) == 66.7


def test_migrations_build_the_schema_from_empty(jobtracker, tmp_path, monkeypatch):
    assert Path("alembic.ini").exists(), "alembic.ini should be at the top of the repository"
    url = f"sqlite:///{(tmp_path / 'jobs.db').as_posix()}"
    env = {**os.environ, "JOBTRACKER_DATABASE_URL": url}
    upgrade = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], capture_output=True, text=True, timeout=120, env=env)
    assert upgrade.returncode == 0, f"alembic upgrade head failed:\n{upgrade.stderr[-2000:]}"
    check = subprocess.run([sys.executable, "-m", "alembic", "check"], capture_output=True, text=True, timeout=120, env=env)
    assert check.returncode == 0, f"alembic check found differences between the models and the migrations:\n{check.stdout[-1000:]}{check.stderr[-1000:]}"
    tables = set(inspect(create_engine(url)).get_table_names())
    assert {"companies", "applications", "stages"} <= tables, f"Expected the three tables after upgrade, found {tables}"
    monkeypatch.setenv("JOBTRACKER_DATABASE_URL", url)
    assert hasattr(jobtracker, "build_app"), "jobtracker/__init__.py should export build_app"
    client = AppClient(jobtracker.build_app())
    try:
        assert ok(client.post("/companies", json={"name": "Migrated"}), 201)["id"] == 1, (
            "build_app() should use the database named by JOBTRACKER_DATABASE_URL"
        )
    finally:
        client.close()


def test_your_own_test_suite_passes(tmp_path):
    assert Path("tests").is_dir(), "Your tests should be in a tests/ folder"
    report = tmp_path / "report.xml"
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests", "-q", "-p", "no:cacheprovider", f"--junitxml={report}"],
        capture_output=True, text=True, timeout=180,
    )
    assert report.exists(), f"Your tests didn't run:\n{result.stdout[-1500:]}{result.stderr[-1500:]}"
    cases = list(ET.parse(report).getroot().iter("testcase"))
    failed = [c.get("name") for c in cases if c.find("failure") is not None or c.find("error") is not None]
    assert not failed, f"These tests in tests/ fail: {failed[:5]}\n{result.stdout[-1500:]}"
    assert cases, "No tests ran in tests/"
