def audit_log():
    print("log opened")
    entries = 0
    try:
        while True:
            entry = yield entries
            entries += 1
            print(f"#{entries}: {entry}")
    finally:
        print(f"log closed after {entries} entries")


log = audit_log()
print(next(log))
print(log.send("login ada"))
print(log.send("export report"))
log.close()
print("closed")


def batch():
    yield "A"
    yield "B"
    return 2


def job():
    count = yield from batch()
    print("batch size", count)
    yield "done"


print(list(job()))
