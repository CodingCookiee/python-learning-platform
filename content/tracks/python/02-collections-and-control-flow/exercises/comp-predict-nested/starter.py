grid = [[1, 2, 3], [4, 5, 6]]

print([n for row in grid for n in row if n % 2 == 0])
print([[n * 10 for n in row] for row in grid])
print(["even" if n % 2 == 0 else "odd" for n in grid[0]])
print({n % 3 for n in range(7)})
print({word: len(word) for word in ["mug", "scarf", "mug"]})

x = "outer"
squares = [x * x for x in range(3)]
print(x, squares)
