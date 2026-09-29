import json


def load_cases(text: str) -> list[dict]:
    """The cases in a JSONL golden dataset, with a line number in every error."""
    cases, seen = [], set()
    for number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            case = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"line {number}: not valid JSON ({error.msg})") from error
        if not isinstance(case, dict):
            raise ValueError(f"line {number}: a case must be a JSON object")
        for key in ("id", "input"):
            if key not in case:
                raise ValueError(f"line {number}: missing {key!r}")
        if case["id"] in seen:
            raise ValueError(f"line {number}: duplicate id {case['id']!r}")
        seen.add(case["id"])
        cases.append(case)
    return cases
