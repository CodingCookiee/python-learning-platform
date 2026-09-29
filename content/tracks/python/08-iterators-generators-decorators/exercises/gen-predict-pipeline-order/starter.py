def read(lines):
    for line in lines:
        print("read", line)
        yield line
    print("read done")


def parse(lines):
    for line in lines:
        status = int(line.split()[1])
        print("parse", status)
        yield status


raw = ["/home 200", "/pay 502", "/cart 404", "/api 503"]
errors = (status for status in parse(read(raw)) if status >= 500)
print("pipeline built")
print("first:", next(errors))
print("rest:", list(errors))
print("again:", list(errors))
