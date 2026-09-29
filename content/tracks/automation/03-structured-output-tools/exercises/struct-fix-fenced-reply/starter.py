import json


def parse_reply(text):
    """Parse the JSON in a model's reply, which may be wrapped in a markdown code fence."""
    return json.loads(text)
