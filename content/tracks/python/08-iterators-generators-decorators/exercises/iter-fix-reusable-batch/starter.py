class OrderBatch:
    """A batch of (order_id, amount) pairs."""

    def __init__(self, orders):
        self.orders = list(orders)
        self.index = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.index >= len(self.orders):
            raise StopIteration
        order = self.orders[self.index]
        self.index += 1
        return order

    def __len__(self):
        return len(self.orders)


def batch_summary(batch):
    count = 0
    for _ in batch:
        count += 1
    total = 0
    for _, amount in batch:
        total += amount
    return {"orders": count, "total": total}
