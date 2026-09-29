import json

_decoder = json.JSONDecoder()


def extract_json(text):
    """Return the first JSON object (a dict) in text. ValueError if there isn't one."""
    start = text.find("{")
    while start != -1:
        try:
            value, _end = _decoder.raw_decode(text, start)
        except json.JSONDecodeError:
            pass
        else:
            if isinstance(value, dict):
                return value
        start = text.find("{", start + 1)
    raise ValueError("No JSON object found in the reply")


LEAD_SYSTEM = "Summarise this lead."


def summarise_lead(llm, email):
    """Ask the model for the lead's fields as JSON and return them as a dict."""
    response = llm.complete([{"role": "user", "content": email}], system=LEAD_SYSTEM)
    return json.loads(response.text)
