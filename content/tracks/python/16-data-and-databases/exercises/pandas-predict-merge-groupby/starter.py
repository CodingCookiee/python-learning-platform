import pandas as pd

orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4],
    "customer_id": [10, 10, 20, 30],
    "total": [100.0, 50.0, None, 70.0],
})
customers = pd.DataFrame({
    "customer_id": [10, 20, 20, 40],
    "region": ["North", "South", "South-West", "East"],
})

inner = pd.merge(orders, customers, on="customer_id")
left = pd.merge(orders, customers, on="customer_id", how="left")
print(len(inner), len(left))
print(int(left["region"].isna().sum()))

by_customer = orders.groupby("customer_id")["total"]
print(by_customer.sum().tolist())
print(by_customer.count().tolist())
print(orders.groupby("customer_id").size().tolist())

print(left.groupby("region")["total"].sum().to_dict())
print(round(orders["total"].mean(), 2))
