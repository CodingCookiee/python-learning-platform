import httpx
from plp import hidden, raises, test
from plp_fakes import fake_api
from solution import SlackError, post_lead_alert

AMIRA = {"name": "Amira Haddad", "company": "Haddad Physio", "email": "amira@example.com"}
OK = {"ok": True, "channel": "C024BE91L", "ts": "1773072000.000100"}


def slack(reply=OK):
    server = fake_api({"POST /api/chat.postMessage": reply})
    client = httpx.Client(transport=server.transport, base_url="https://slack.com/api")
    return server, client


@test("Posts the alert and returns the message ts")
def _():
    server, client = slack()
    assert post_lead_alert(client, "test-token", "#leads", AMIRA) == "1773072000.000100"
    assert server.calls("POST /api/chat.postMessage")[0].json == {
        "channel": "#leads",
        "text": "New lead: Amira Haddad (Haddad Physio) amira@example.com",
    }


@test("Sends the bot token as a bearer token")
def _():
    server, client = slack()
    post_lead_alert(client, "test-token", "#leads", AMIRA)
    assert server.requests[0]["headers"].get("authorization") == "Bearer test-token"


@test("Raises SlackError with Slack's code when ok is false")
def _():
    _, client = slack({"ok": False, "error": "channel_not_found"})
    raises(SlackError, post_lead_alert, client, "test-token", "#leeds", AMIRA, match="channel_not_found")


@test("Leaves out the brackets when there's no company")
def _():
    server, client = slack()
    post_lead_alert(client, "test-token", "#leads", {"name": "Tom Price", "email": "tom@example.com"})
    assert server.requests[0].json["text"] == "New lead: Tom Price tom@example.com"


@hidden("Escapes the name and company")
def _():
    server, client = slack()
    lead = {"name": "<!channel>", "company": "Smith & Sons", "email": "x@example.com"}
    post_lead_alert(client, "test-token", "#leads", lead)
    assert server.requests[0].json["text"] == "New lead: &lt;!channel&gt; (Smith &amp; Sons) x@example.com"


@hidden("An empty or None company is treated as missing")
def _():
    server, client = slack()
    post_lead_alert(client, "test-token", "#leads", {**AMIRA, "company": ""})
    post_lead_alert(client, "test-token", "#leads", {**AMIRA, "company": None})
    assert [r.json["text"] for r in server.requests] == ["New lead: Amira Haddad amira@example.com"] * 2


@hidden("HTTP errors such as 429 raise HTTPStatusError")
def _():
    _, client = slack(lambda req: (429, {"ok": False, "error": "ratelimited"}, {"Retry-After": "3"}))
    raises(httpx.HTTPStatusError, post_lead_alert, client, "test-token", "#leads", AMIRA)
