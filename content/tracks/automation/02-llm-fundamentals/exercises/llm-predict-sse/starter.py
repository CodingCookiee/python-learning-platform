import json

sample = """event: message_start
data: {"type": "message_start"}

event: content_block_delta
data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Order #1042 "}}

: keep-alive

event: content_block_delta
data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "has shipped."}}

event: message_stop
data: {"type": "message_stop"}"""


def events(lines):
    name, data = None, []
    for line in lines:
        if line == "":
            if data:
                yield name, "\n".join(data)
            name, data = None, []
        elif not line.startswith(":"):
            field, _, value = line.partition(": ")
            if field == "event":
                name = value
            elif field == "data":
                data.append(value)


count = 0
for name, data in events(sample.splitlines()):
    count += 1
    if name == "content_block_delta":
        print(repr(json.loads(data)["delta"]["text"]))
print(count)
