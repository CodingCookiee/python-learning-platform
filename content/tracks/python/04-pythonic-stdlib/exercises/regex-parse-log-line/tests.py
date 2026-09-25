from plp import test, hidden
from solution import parse_line


@test("Parses a GET request")
def _():
    line = '203.0.113.9 - - [25/Sep/2026:14:03:07 +0000] "GET /cart?item=42 HTTP/1.1" 200 5123'
    assert parse_line(line) == {
        "ip": "203.0.113.9",
        "time": "25/Sep/2026:14:03:07 +0000",
        "method": "GET",
        "path": "/cart?item=42",
        "status": 200,
        "size": 5123,
    }


@test("A size of - becomes 0")
def _():
    line = '198.51.100.4 - - [25/Sep/2026:14:05:00 +0000] "POST /pay HTTP/1.1" 502 -'
    entry = parse_line(line)
    assert entry["method"] == "POST" and entry["status"] == 502
    assert entry["size"] == 0


@test("Returns None for a line that isn't a log entry")
def _():
    assert parse_line("server restarted at 14:10") is None
    assert parse_line("") is None


@hidden("Ignores the extra fields of the combined format")
def _():
    line = (
        '192.0.2.77 - ada [25/Sep/2026:15:00:01 +0100] "GET /account HTTP/2.0" 304 0 '
        '"https://shop.example/" "Mozilla/5.0 (X11; Linux x86_64)"'
    )
    entry = parse_line(line)
    assert entry["ip"] == "192.0.2.77"
    assert entry["time"] == "25/Sep/2026:15:00:01 +0100"
    assert (entry["path"], entry["status"], entry["size"]) == ("/account", 304, 0)


@hidden("status and size are ints")
def _():
    entry = parse_line('10.0.0.1 - - [25/Sep/2026:14:03:07 +0000] "DELETE /cart/7 HTTP/1.1" 204 0')
    assert type(entry["status"]) is int and type(entry["size"]) is int
