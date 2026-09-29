import json

FENCE = "`" * 3

replies = [
    '{"company": "Northwind", "wants_demo": true}',
    FENCE + 'json\n{"company": "Northwind"}\n' + FENCE,
    'Here is the JSON: {"company": "Northwind"}',
    "{'company': 'Northwind'}",
    '{"company": "Northwind"}\n',
]

for reply in replies:
    try:
        data = json.loads(reply)
        print("parsed:", data)
    except json.JSONDecodeError as error:
        print("failed:", error.msg, "at char", error.pos)
