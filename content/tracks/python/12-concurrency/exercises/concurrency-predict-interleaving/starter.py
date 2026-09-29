def handler(name, pauses):
    print(f"start {name}")
    for step in range(pauses):
        yield
        print(f"resume {name}")
    return f"{name} ok"


waiting = [handler("payments", 2), handler("refunds", 1), handler("emails", 0)]
while waiting:
    job = waiting.pop(0)
    try:
        next(job)
        waiting.append(job)
    except StopIteration as finished:
        print(finished.value)
