from plp import test, hidden, source_avoids, source_uses
from solution import total_bytes


def big_log(count):
    for n in range(count):
        yield f'203.0.113.{n % 250} "GET /page/{n}" 200 {n % 1000}'


@test("Totals the byte counts, skipping -")
def _():
    log = [
        '203.0.113.9 "GET /home" 200 5120',
        '203.0.113.9 "GET /logo.png" 304 -',
        '198.51.100.4 "POST /pay" 201 734',
    ]
    assert total_bytes(log) == 5854


@test("Uses a generator expression")
def _():
    assert source_uses(node="GeneratorExp"), "total_bytes should sum a generator expression"


@test("Builds no list")
def _():
    assert source_avoids(call="append"), "there should be no .append() left: nothing needs collecting"
    assert source_avoids(node="ListComp"), "a list comprehension still builds the whole list; use round brackets"


@hidden("Streams a long log")
def _():
    assert total_bytes(big_log(100_000)) == 49_950_000


@hidden("An empty log, or one with nothing sent")
def _():
    assert total_bytes([]) == 0
    assert total_bytes(['203.0.113.9 "GET /" 304 -']) == 0
