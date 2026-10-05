import pytest

from conftest import add_application, add_company, add_stage


async def test_create_application(client):
    await add_company(client)
    body = await add_application(client, salary_min=70000, salary_max=80000)
    assert body["status"] == "applied" and body["company"] == "Northwind" and body["stages"] == []


async def test_unknown_company_is_404(client):
    response = await client.post(
        "/applications", json={"company_id": 9, "role": "SRE", "source": "direct", "applied_on": "2026-09-30"}
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Company 9 not found"}


async def test_salary_range_is_checked(client):
    await add_company(client)
    response = await client.post("/applications", json={
        "company_id": 1, "role": "SRE", "source": "direct", "applied_on": "2026-09-30",
        "salary_min": 90000, "salary_max": 80000,
    })
    assert response.status_code == 422


async def test_list_filters_and_sorts(client):
    await add_company(client, "Northwind")
    await add_company(client, "Globex")
    await add_application(client, 1, applied_on="2026-09-01")
    await add_application(client, 2, applied_on="2026-09-03")
    await add_application(client, 1, applied_on="2026-09-02")
    newest = await client.get("/applications", params={"sort": "-applied_on"})
    by_company = await client.get("/applications", params={"sort": "company"})
    northwind = await client.get("/applications", params={"company_id": 1})
    assert [a["id"] for a in newest.json()] == [2, 3, 1]
    assert [a["company"] for a in by_company.json()] == ["Globex", "Northwind", "Northwind"]
    assert [a["id"] for a in northwind.json()] == [1, 3]


async def test_unknown_sort_is_422(client):
    assert (await client.get("/applications", params={"sort": "salary"})).status_code == 422


@pytest.mark.parametrize(
    "path, target",
    [
        ([], "interviewing"), ([], "rejected"), ([], "withdrawn"),
        (["interviewing"], "offer"), (["interviewing", "offer"], "accepted"),
    ],
)
async def test_allowed_transitions(client, path, target):
    await add_company(client)
    app_id = (await add_application(client))["id"]
    for step in path:
        await client.patch(f"/applications/{app_id}", json={"status": step})
    response = await client.patch(f"/applications/{app_id}", json={"status": target})
    assert response.json()["status"] == target


@pytest.mark.parametrize("closed", ["accepted", "rejected", "withdrawn"])
async def test_closed_applications_cannot_move(client, closed):
    await add_company(client)
    app_id = (await add_application(client))["id"]
    steps = ["interviewing", "offer", "accepted"] if closed == "accepted" else [closed]
    for step in steps:
        await client.patch(f"/applications/{app_id}", json={"status": step})
    response = await client.patch(f"/applications/{app_id}", json={"status": "interviewing"})
    assert response.status_code == 409
    assert response.json() == {"detail": f"Can't move an application from {closed} to interviewing"}


async def test_same_status_is_allowed(client):
    await add_company(client)
    await add_application(client)
    assert (await client.patch("/applications/1", json={"status": "applied"})).status_code == 200


async def test_delete_application_removes_stages(client):
    await add_company(client)
    await add_application(client)
    await add_stage(client, 1)
    assert (await client.delete("/applications/1")).status_code == 204
    assert (await client.patch("/stages/1", json={"outcome": "passed"})).status_code == 404


async def test_list_applications_query_count_is_constant(client, queries):
    await add_company(client)
    for _ in range(3):
        app_id = (await add_application(client))["id"]
        await add_stage(client, app_id)
    queries.clear()
    await client.get("/applications")
    few = len(queries)
    for _ in range(27):
        app_id = (await add_application(client))["id"]
        await add_stage(client, app_id)
    queries.clear()
    await client.get("/applications")
    assert len(queries) == few
