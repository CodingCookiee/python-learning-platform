from conftest import add_application, add_company, add_stage


async def test_first_stage_moves_application_to_interviewing(client):
    await add_company(client)
    await add_application(client)
    response = await add_stage(client, 1)
    assert response.status_code == 201
    assert response.json()["status"] == "interviewing"
    assert response.json()["stages"] == [
        {"id": 1, "kind": "phone screen", "scheduled_at": "2026-09-08T10:00:00", "outcome": "pending", "notes": ""}
    ]


async def test_stages_are_in_scheduled_order(client):
    await add_company(client)
    await add_application(client)
    await add_stage(client, 1, "2026-09-20T10:00:00", "final")
    response = await add_stage(client, 1, "2026-09-05T10:00:00")
    assert [s["kind"] for s in response.json()["stages"]] == ["phone screen", "final"]


async def test_closed_application_refuses_stages(client):
    await add_company(client)
    await add_application(client)
    await client.patch("/applications/1", json={"status": "withdrawn"})
    response = await add_stage(client, 1)
    assert response.status_code == 409
    assert response.json() == {"detail": "Can't add a stage to an application that is withdrawn"}


async def test_stage_for_missing_application_is_404(client):
    assert (await add_stage(client, 9)).status_code == 404


async def test_update_stage_outcome(client):
    await add_company(client)
    await add_application(client)
    await add_stage(client, 1)
    response = await client.patch("/stages/1", json={"outcome": "passed"})
    assert response.json()["outcome"] == "passed"
    assert "application_id" not in response.json()


async def test_update_missing_stage_is_404(client):
    assert (await client.patch("/stages/9", json={"outcome": "passed"})).status_code == 404
