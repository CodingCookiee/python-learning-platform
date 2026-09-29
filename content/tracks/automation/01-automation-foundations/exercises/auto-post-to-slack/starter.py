import httpx


class SlackError(Exception):
    """Slack said ok: false. The message is Slack's error code, e.g. "channel_not_found"."""


def slack_escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def post_lead_alert(client, token, channel, lead):
    """Post "New lead: ..." to channel; return the message ts. Raise SlackError when ok is false."""
    ...
