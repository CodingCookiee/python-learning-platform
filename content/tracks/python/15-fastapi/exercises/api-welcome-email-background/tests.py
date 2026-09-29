import httpx

from plp import hidden, source_uses, test
from solution import accounts, app, outbox


def client():
    # raise_app_exceptions=False: the client sees what a real client would, even if a task fails later
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def sign_up(email, name):
    async with client() as api:
        response = await api.post("/signups", json={"email": email, "name": name})
    return response.status_code, response.json()


def reset():
    accounts.clear()
    outbox.clear()


@test("Ada signs up and gets her welcome email")
async def _():
    reset()
    assert await sign_up("ada@example.com", "Ada") == (201, {"email": "ada@example.com", "status": "active"})
    assert outbox == [{"to": "ada@example.com", "subject": "Welcome to the job board, Ada"}]


@test("A refused email doesn't turn the signup into a 500")
async def _():
    reset()
    assert await sign_up("grace@bounce.example", "Grace") == (201, {"email": "grace@bounce.example", "status": "active"})
    assert [account["name"] for account in accounts] == ["Grace"]


@test("The email is scheduled with add_task")
def _():
    assert source_uses(call="add_task"), "Schedule the email with background_tasks.add_task(...)"


@hidden("An invalid signup sends nothing")
async def _():
    reset()
    async with client() as api:
        assert (await api.post("/signups", json={"email": "katherine@example.com"})).status_code == 422
    assert (outbox, accounts) == ([], [])
