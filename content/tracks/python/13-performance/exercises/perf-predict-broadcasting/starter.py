import numpy as np

prices = np.array([8.50, 24.00, 2.35])
print((prices * 2).shape)

discounts = np.array([[0.0], [0.1]])
print((prices * (1 - discounts)).shape)

stock = np.array([[4, 0, 12], [7, 3, 0]])
print(stock.shape, stock.sum(axis=0).tolist(), stock.sum(axis=1).tolist())
print((stock == 0).sum())

try:
    stock + np.array([1, 2])
except ValueError:
    print("(2, 3) and (2,) don't broadcast")

print((stock + np.array([[1], [2]])).tolist())
