import json
import re

FENCED = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL | re.IGNORECASE)


def parse_reply(text):
    """Parse the JSON in a model's reply, which may be wrapped in a markdown code fence."""
    text = text.strip()
    match = FENCED.match(text)
    if match:
        text = match.group(1)
    return json.loads(text)
