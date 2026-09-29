def slack_escape(text):
    """Escape &, < and > so Slack shows them as text."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
