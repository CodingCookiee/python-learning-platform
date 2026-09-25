bins = [4, 0, 7, 0, 3]

for position, count in enumerate(bins):
    if count == 0:
        continue
    if count > 5:
        print("Overfull bin at", position)
        break
    print("Bin", position, "has", count)
else:
    print("All bins checked")

for count in [1, 2]:
    pass
else:
    print("Second loop finished")

n = 3
while n > 0:
    n -= 2
print(n)
