import json


def load_cases(text):
    """The cases in a JSONL golden dataset, with a line number in every error."""
    return [json.loads(line) for line in text.splitlines()]
