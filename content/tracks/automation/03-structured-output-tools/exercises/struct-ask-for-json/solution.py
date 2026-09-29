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


LEAD_SYSTEM = """You extract sales leads from inbound emails.
Reply with only a JSON object, no prose and no code fences, with exactly these fields:
  "company": string, the prospect's company name
  "seats": integer or null, how many people would use the product
  "deadline": string or null, when they need it, as the email says it
  "wants_demo": boolean, true only if they ask for a demo or a call
Use null when the email doesn't say. Never guess."""


def summarise_lead(llm, email):
    """Ask the model for the lead's fields as JSON and return them as a dict."""
    messages = [{"role": "user", "content": f"<email>\n{email}\n</email>"}]
    response = llm.complete(messages, system=LEAD_SYSTEM, temperature=0)
    if response.stop_reason == "max_tokens":
        raise ValueError("The reply was cut off at max_tokens")
    return extract_json(response.text)
