from inspect import getgeneratorstate


def read_orders():
    print("connecting")
    yield "A1"
    print("after A1")
    yield "A2"
    print("after A2")
    return 2


feed = read_orders()
print("created", getgeneratorstate(feed))
print("first", next(feed))
print("paused", getgeneratorstate(feed))
for order in feed:
    print("loop got", order)
print("finished", getgeneratorstate(feed))
print("again", list(feed))

feed = read_orders()
next(feed)
next(feed)
try:
    next(feed)
except StopIteration as stop:
    print("returned", stop.value)
