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


async def add_company(client, name="Northwind", website=None):
    response = await client.post("/companies", json={"name": name, "website": website})
    assert response.status_code == 201
    return response.json()


async def add_application(client, company_id=1, applied_on="2026-09-01", **changes):
    body = {"company_id": company_id, "role": "Engineer", "source": "direct", "applied_on": applied_on, **changes}
    response = await client.post("/applications", json=body)
    assert response.status_code == 201
    return response.json()


async def add_stage(client, application_id, scheduled_at="2026-09-08T10:00:00", kind="phone screen"):
    return await client.post(f"/applications/{application_id}/stages", json={"kind": kind, "scheduled_at": scheduled_at})
