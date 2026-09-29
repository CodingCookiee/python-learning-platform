import httpx


class SlackError(Exception):
    """Slack said ok: false. The message is Slack's error code, e.g. "channel_not_found"."""


def slack_escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def alert_text(lead):
    who = slack_escape(lead["name"])
    if lead.get("company"):
        who += f" ({slack_escape(lead['company'])})"
    return f"New lead: {who} {lead['email']}"


def post_lead_alert(client, token, channel, lead):
    """Post "New lead: ..." to channel; return the message ts. Raise SlackError when ok is false."""
    response = client.post(
        "/chat.postMessage",
        json={"channel": channel, "text": alert_text(lead)},
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()
    data = response.json()
    if not data.get("ok"):
        raise SlackError(data.get("error", "unknown_error"))
    return data["ts"]
