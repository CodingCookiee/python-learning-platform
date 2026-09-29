def slack_escape(text):
    """Escape &, < and > so Slack shows them as text."""
    return text.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;")
