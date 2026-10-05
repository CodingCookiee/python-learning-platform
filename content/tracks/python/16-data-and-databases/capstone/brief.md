This is your black belt grading. Sixteen modules ago you ran your first line of Python; this
project asks you to use nearly all of it at once, the way a working Python developer does: a typed,
tested web service backed by a real database, with a schema that changes through migrations and a
report built with pandas. Pass it and you hold 1st dan, and the AI Automation track opens.

The project is one you'll actually use. Job searches are run from spreadsheets that lose track of
who replied, which interviews are next, and whether anything is working. You'll build **Job
tracker**: a service that records the companies you apply to, each application, and every interview
stage, enforces the rules a spreadsheet can't, and answers the Monday-morning question with a
weekly report. Later modules of the automation track plug webhooks, email and an AI assistant into
it, so build it to last.

Build it on your own machine, in a uv project. The models, the report and your tests also run in
the browser (see "Trying pieces in the browser"), which is handy while you work out a query.

## The data

Three tables, each a SQLAlchemy 2.0 model on one `Base(DeclarativeBase)`:

| Model | Columns | Relationships |
|-------|---------|---------------|
| `Company` | `id`; `name` (required, unique, at most 100 characters); `website` (optional) | `applications`, deleted with the company |
| `Application` | `id`; `company_id` (indexed foreign key); `role` (required, at most 100); `source`; `status` (default `applied`); `applied_on` (a date); `salary_min` and `salary_max` (optional whole pounds); `notes` (default empty) | `company`; `stages` in `scheduled_at` order, deleted with the application |
| `Stage` | `id`; `application_id` (indexed foreign key); `kind`; `scheduled_at` (a datetime); `outcome` (default `pending`); `notes` (default empty) | `application` |

The allowed values are in the starter as `Literal` types:

- `source`: `job board`, `referral`, `recruiter`, `direct`
- `status`: `applied`, `interviewing`, `offer`, `accepted`, `rejected`, `withdrawn`
- `kind`: `phone screen`, `technical`, `take-home`, `onsite`, `final`
- `outcome`: `pending`, `passed`, `failed`

### The status rules

An application moves forward only along these transitions (they're `TRANSITIONS` in the starter):

| From | To |
|------|----|
| `applied` | `interviewing`, `rejected`, `withdrawn` |
| `interviewing` | `offer`, `rejected`, `withdrawn` |
| `offer` | `accepted`, `rejected`, `withdrawn` |
| `accepted`, `rejected`, `withdrawn` | nothing: the application is closed |

- Setting the status it already has is allowed and changes nothing.
- Any other change is refused with **409 Conflict**, naming both statuses:
  `Can't move an application from rejected to interviewing`.
- Adding a stage to an `applied` application moves it to `interviewing` in the same commit.
- A stage can only be added while the application is `applied` or `interviewing`; otherwise 409:
  `Can't add a stage to an application that is withdrawn`.

`applied`, `interviewing` and `offer` are the **active** statuses.

## The API

`create_app(engine)` builds the app around an engine, so the tests can hand it a fresh in-memory
database and uvicorn can hand it the real one. Each request gets its own session from a
`get_session` dependency (it's in the starter), does its work, and commits once.

| Method and path | Body or query | Success | Refusals |
|-----------------|---------------|---------|----------|
| `POST /companies` | `name`, `website?` | 201 `CompanyOut` | 409 duplicate name, 422 invalid body |
| `GET /companies` | | 200 list of `CompanyOut`, by name | |
| `GET /companies/{id}` | | 200 `CompanyOut` | 404 |
| `DELETE /companies/{id}` | | 204, and its applications and stages are gone | 404 |
| `POST /applications` | `company_id`, `role`, `source`, `applied_on`, `salary_min?`, `salary_max?`, `notes?` | 201 `ApplicationOut` | 404 unknown company, 422 invalid body or `salary_min` above `salary_max` |
| `GET /applications` | `status?`, `company_id?`, `sort` (`applied_on`, `-applied_on` or `company`; default `applied_on`) | 200 list of `ApplicationOut` | 422 any other sort |
| `GET /applications/{id}` | | 200 `ApplicationOut` | 404 |
| `PATCH /applications/{id}` | `status?`, `notes?` | 200 `ApplicationOut` | 404, 409 disallowed transition |
| `DELETE /applications/{id}` | | 204, and its stages are gone | 404 |
| `POST /applications/{id}/stages` | `kind`, `scheduled_at`, `notes?` | 201 `ApplicationOut`, with the new stage | 404, 409 closed application |
| `PATCH /stages/{id}` | `outcome?`, `notes?` | 200 `StageOut` | 404 |
| `GET /reports/weekly` | `today?` (default: today), `weeks?` (default 4) | 200 list of `WeekRow` | 422 |
| `GET /reports/weekly.csv` | the same | 200 `text/csv`, the same report | 422 |

Every refusal has a JSON body with a `detail`: `{"detail": "Company 9 not found"}`. 422 bodies are
FastAPI's own.

The response models:

- `CompanyOut`: `id`, `name`, `website`, `applications` (how many, any status) and `active` (how
  many are active).
- `ApplicationOut`: every application column, plus `company` (the company's name) and `stages`
  (a list of `StageOut`, in scheduled order).
- `StageOut`: every stage column except `application_id`.
- `WeekRow`: the report's columns (next section).

`GET /companies` must build every company's counts in **one** query, with an outer join, a
`GROUP BY` and `count()`; `func.count(Application.id).filter(Application.status.in_(ACTIVE))`
counts only active ones. `GET /applications` loads its stages with `selectinload`. Your tests
prove both with a query counter, as in lesson 5.

## The weekly report

`weekly_report(session, today, weeks=4)` returns a DataFrame with one row per week for the `weeks`
weeks ending with the week that contains `today`. Weeks start on Monday, and every week appears,
oldest first, even if nothing happened in it.

| Column | Counts |
|--------|--------|
| `week` | The Monday the week starts on |
| `applied` | Applications with `applied_on` in that week |
| `responses` | Of the `applied` ones, those that heard back: any status except `applied` and `withdrawn` |
| `interviews` | Of the `responses`, those with at least one stage |
| `offers` | Of the `interviews`, those at `offer` or `accepted` |
| `response_rate` | `responses` as a percentage of `applied`, to 1 decimal place, or `0.0` for a week with none |
| `stages` | Stages **scheduled** in that week, whichever week their application was sent |

The first five columns are about the applications *sent* that week, so you can see which weeks'
applications worked. They're a funnel: each one counts some of the applications in the column before
it. So an application that had an interview and was then withdrawn is neither a response nor an
interview, and one moved to `offer` without any stage isn't counted as an offer.

Let SQL fetch only the applications and stages inside the window (use
`pd.read_sql_query(stmt, session.connection(), ...)` with a `select()`), and let pandas do the
grouping, the empty weeks and the percentages. `GET /reports/weekly` returns
`df.to_dict("records")` through `WeekRow`, and the CSV endpoint returns `df.to_csv(index=False)`.

## A sample run

Against a fresh database, five companies are created (Northwind first, then Globex, Initech, Hooli
and Umbrella) and seven applications sent:

| id | Company | Role | Source | Applied on |
|----|---------|------|--------|------------|
| 1 | Northwind | Backend engineer (salary 70,000–80,000) | referral | 2026-09-01 |
| 2 | Globex | Data engineer | job board | 2026-09-02 |
| 3 | Initech | Python developer | job board | 2026-09-04 |
| 4 | Hooli | Platform engineer | recruiter | 2026-09-10 |
| 5 | Umbrella | SRE | job board | 2026-09-11 |
| 6 | Northwind | Data platform engineer | direct | 2026-09-22 |
| 7 | Globex | Analytics engineer | referral | 2026-09-23 |

Then: application 1 gets a phone screen (2026-09-08 10:00), a technical (09-15 14:00) and a final
(09-24 11:00), the first two are marked `passed`, and it moves to `offer`. Application 2 is
`rejected`. Application 4 gets a phone screen on 09-17 09:30. Application 5 is `withdrawn`.
Application 7 gets a phone screen on 09-29 16:00. These requests and responses follow:

```text
$ POST /companies {"name": "Northwind", "website": "https://northwind.example"}
201 {"id":1,"name":"Northwind","website":"https://northwind.example","applications":0,"active":0}

$ POST /companies {"name": "Northwind"}
409 {"detail":"A company called 'Northwind' already exists"}

$ POST /applications/1/stages {"kind": "phone screen", "scheduled_at": "2026-09-08T10:00:00"}
201 {"id":1,"company_id":1,"company":"Northwind","role":"Backend engineer","source":"referral",
     "status":"interviewing","applied_on":"2026-09-01","salary_min":70000,"salary_max":80000,
     "notes":"","stages":[{"id":1,"kind":"phone screen","scheduled_at":"2026-09-08T10:00:00",
     "outcome":"pending","notes":""}]}

$ PATCH /applications/2 {"status": "interviewing"}
409 {"detail":"Can't move an application from rejected to interviewing"}

$ POST /applications/5/stages {"kind": "technical", "scheduled_at": "2026-09-30T10:00:00"}
409 {"detail":"Can't add a stage to an application that is withdrawn"}

$ POST /applications {"company_id": 9, "role": "SRE", "source": "direct", "applied_on": "2026-09-30"}
404 {"detail":"Company 9 not found"}

$ GET /companies
200 [{"id":2,"name":"Globex","website":null,"applications":2,"active":1},
     {"id":4,"name":"Hooli","website":null,"applications":1,"active":1},
     {"id":3,"name":"Initech","website":null,"applications":1,"active":1},
     {"id":1,"name":"Northwind","website":"https://northwind.example","applications":2,"active":2},
     {"id":5,"name":"Umbrella","website":null,"applications":1,"active":0}]

$ GET /applications?status=interviewing&sort=-applied_on
200 [ application 7 (Globex, Analytics engineer), then application 4 (Hooli, Platform engineer) ]

$ GET /applications?sort=salary
422 (FastAPI's validation error for the sort parameter)

$ GET /reports/weekly.csv?today=2026-10-02&weeks=5
200
week,applied,responses,interviews,offers,response_rate,stages
2026-08-31,3,2,1,1,66.7,0
2026-09-07,2,1,1,0,50.0,1
2026-09-14,0,0,0,0,0.0,2
2026-09-21,2,1,1,0,50.0,1
2026-09-28,0,0,0,0,0.0,1

$ DELETE /companies/1
204

$ GET /applications/1
404 {"detail":"Application 1 not found"}
```

After the delete, five applications remain. (The long JSON lines are wrapped here; yours will be on
one line.) Put this whole scenario in one test, and it's the best regression test you'll have.

## The project

```text
jobtracker/
  pyproject.toml          # uv project: fastapi, sqlalchemy, pandas, alembic, uvicorn; dev: pytest, ruff, mypy
  README.md
  alembic.ini
  migrations/
    env.py
    versions/…
  src/jobtracker/
    __init__.py           # exports create_app, build_app, Base
    models.py
    schemas.py
    api.py                # routers for companies, applications, stages, reports
    report.py             # weekly_report
    db.py                 # get_session, build_app
  tests/
    conftest.py
    test_companies.py
    test_applications.py
    test_stages.py
    test_report.py
```

The starter is a single file with the rules, the `Company` model, two schemas, `get_session`,
`create_app` with two endpoints done, and `build_app` for uvicorn. Get it working as one file first,
then split it along the lines above. Routers (`APIRouter`, module 15) keep `api.py` readable.

## Testing

Every test gets its own database, so tests can run in any order. In `conftest.py`:

```python norun
import httpx
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool

from jobtracker import Base, create_app


@pytest.fixture
def engine():
    # StaticPool: every session shares the one in-memory connection, so they see the same data
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
async def client(engine):
    transport = httpx.ASGITransport(app=create_app(engine))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def queries(engine):
    seen = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, *rest: seen.append(sql))
    return seen
```

Async tests and fixtures need `pytest-asyncio` or `anyio`'s plugin (`uv add --dev pytest-asyncio`,
and `asyncio_mode = "auto"` under `[tool.pytest.ini_options]`). `create_all` is right here: tests
build a throwaway schema. The real database only ever changes through Alembic.

Cover, at least: each endpoint's success and each of its refusals; every allowed transition and a
refused one from each closed status; the automatic move to `interviewing`; that deleting a company
removes its applications and stages and nothing else; the report's empty weeks, a withdrawn
application, a stage scheduled in a later week than its application, and `weeks=1`; and that
`GET /companies` takes the same number of queries for 3 companies as for 30. Test `weekly_report`
directly as well as through the API, with sessions from `Session(engine)`.
`uv run pytest --cov=jobtracker` (with `pytest-cov`) should report at least 90%.

## Migrations

1. `uv run alembic init migrations`, then in `env.py` import your `Base`, set
   `target_metadata = Base.metadata`, and read the URL from `JOBTRACKER_DATABASE_URL` the same way
   `build_app` does. Pass `render_as_batch=True` to `context.configure` for SQLite.
2. Autogenerate the first migration, **read it**, and run `uv run alembic upgrade head`.
3. Make one real change afterwards, such as a `location` column on `Company`, as a second migration.
   `uv run alembic check` should then report that the models and the database agree.

`build_app` never calls `create_all`: if you delete `jobs.db`, `alembic upgrade head` is what
brings it back.

## Trying pieces in the browser

Any pylearn code block can be edited and run, and SQLAlchemy, pandas, FastAPI and httpx all load in
the browser. Paste your models and `weekly_report` into one, add a few rows with a `Session`, and
print the report: it's a quick way to get the pandas right. The whole app works too, called through
`httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")` with a top-level
`await`. uvicorn, Alembic and your pytest run need your machine.

## Stretch goals

- **Upcoming interviews.** `GET /stages/upcoming?days=7` lists pending stages in the next week with
  their company and role, from one query (`joinedload` through the chain, as in lesson 5).
- **Search.** `GET /applications?q=engineer` matches role, company or notes, case-insensitively,
  with the value passed as a parameter.
- **Pagination.** `limit` and `offset` on the list endpoints, with a `Link` header (module 14).
- **Status history.** A `StatusChange` model records every transition with a timestamp, and
  `GET /applications/{id}/history` returns it. Add it through a migration, with a backfill that
  records the current status of existing applications.
- **PostgreSQL.** Run the service and the migrations against PostgreSQL in Docker, and make the
  tests pass against it as well as SQLite.
- **CSV import.** `POST /applications/import` takes your old spreadsheet as CSV, cleans it with
  pandas, and imports every row or none, reporting bad rows by line number.

## How it's tested

Automated tests run on every push to your repository. They rely on this:

- `pyproject.toml` has a `[build-system]` table (as `uv init --package` writes) and lists
  fastapi, sqlalchemy, pandas and alembic as dependencies, so `jobtracker` installs from
  `src/jobtracker/`. The tests install httpx and pytest-asyncio themselves.
- `jobtracker` exports `Base`, `create_app` and `build_app`, and `weekly_report` is in
  `jobtracker/report.py`.
- Each test builds a fresh in-memory SQLite engine, calls `Base.metadata.create_all`, passes it to
  `create_app`, and sends requests in-process over `httpx.ASGITransport`. The sample run above is
  replayed, and every status code and body it shows is checked. Refusals are checked for their
  `detail`, word for word where the brief gives one.
- The query-count test lists 3 and then 30 companies (and applications, each with two stages) and
  counts the SQL statements each list runs.
- With `JOBTRACKER_DATABASE_URL` set to an empty SQLite file, `alembic upgrade head` and then
  `alembic check` must both succeed from the top of the repository, and `build_app()` must use that
  database.
- Your own suite runs with `pytest tests` from the top of the repository and must pass.

## How to submit

Push the project to a GitHub repository. Connect it on this capstone's page and add the workflow
file it gives you (`.github/workflows/pylearn.yml`): the tests then run on every push, and the page
shows the results. The README should say what the service does, how to install it, migrate the
database, run it and run the tests.

The review runs your test suite and its coverage, runs `alembic upgrade head` on an empty database
and then `alembic check`, replays the sample run against `create_app` with a fresh engine, and runs
its own hidden tests, including query counts. Then it reads the code against the criteria:
2.0-style models and queries, parameters everywhere, one commit per request, cascades that are
right, a report that is correct at the edges, and tests you'd be happy to inherit. Pass, and you're
a black belt.
