orders = [("A1", 12.5), ("A2", 8.0), ("A3", 30.0)]
amounts = map(lambda order: order[1], orders)
print(sum(amounts))
print(sum(amounts))

log_ids = iter(["L1", "L2", "L3", "L4"])
print("L2" in log_ids)
print(list(log_ids))
print("L1" in log_ids)

visits = zip(["mon", "tue", "wed"], [3, 5, 2])
print(dict(visits))
print(len(list(visits)))

paths = ["/home", "/cart"]
it = iter(paths)
print(iter(it) is it, iter(paths) is iter(paths))
print(next(it), next(iter(paths)), next(it))
print(next(it, "done"))
