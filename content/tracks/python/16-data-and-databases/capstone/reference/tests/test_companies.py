from conftest import add_application, add_company, add_stage


async def test_create_company(client):
    assert await add_company(client, website="https://northwind.example") == {
        "id": 1, "name": "Northwind", "website": "https://northwind.example", "applications": 0, "active": 0
    }


async def test_duplicate_company_is_409(client):
    await add_company(client)
    response = await client.post("/companies", json={"name": "Northwind"})
    assert response.status_code == 409
    assert response.json() == {"detail": "A company called 'Northwind' already exists"}


async def test_list_companies_by_name_with_counts(client):
    await add_company(client, "Northwind")
    await add_company(client, "Globex")
    await add_application(client, 1)
    second = await add_application(client, 1)
    await client.patch(f"/applications/{second['id']}", json={"status": "withdrawn"})
    response = await client.get("/companies")
    assert [(c["name"], c["applications"], c["active"]) for c in response.json()] == [
        ("Globex", 0, 0), ("Northwind", 2, 1)
    ]


async def test_get_company_404(client):
    response = await client.get("/companies/9")
    assert response.status_code == 404
    assert response.json() == {"detail": "Company 9 not found"}


async def test_delete_company_cascades_to_applications_and_stages(client):
    await add_company(client, "Northwind")
    await add_company(client, "Globex")
    first = await add_application(client, 1)
    other = await add_application(client, 2)
    await add_stage(client, first["id"])
    await add_stage(client, other["id"])
    assert (await client.delete("/companies/1")).status_code == 204
    assert (await client.get(f"/applications/{first['id']}")).status_code == 404
    assert (await client.patch("/stages/1", json={"outcome": "passed"})).status_code == 404
    assert (await client.get(f"/applications/{other['id']}")).json()["stages"][0]["id"] == 2


async def test_list_companies_query_count_is_constant(client, queries):
    for n in range(3):
        await add_company(client, f"Company {n}")
    queries.clear()
    await client.get("/companies")
    few = len(queries)
    for n in range(3, 30):
        await add_company(client, f"Company {n}")
        await add_application(client, n + 1)
    queries.clear()
    await client.get("/companies")
    assert len(queries) == few
