class OrderBatch:
    """A batch of (order_id, amount) pairs."""

    def __init__(self, orders):
        self.orders = list(orders)

    def __iter__(self):
        return iter(self.orders)

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
