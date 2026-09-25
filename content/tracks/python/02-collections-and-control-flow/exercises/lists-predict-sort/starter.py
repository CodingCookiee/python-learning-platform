stock = [5, 12, 3]
ordered = sorted(stock)
print(stock)
print(ordered)
result = stock.sort(reverse=True)
print(result)
print(stock)
print(ordered[-1] == stock[0])
