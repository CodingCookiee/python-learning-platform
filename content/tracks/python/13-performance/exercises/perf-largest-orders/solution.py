import heapq


def largest_orders(lines, k):
    """The k largest orders in a stream of "order_id,amount" lines, biggest first."""
    orders = (parse(line) for line in lines if line.strip())
    return heapq.nlargest(k, orders, key=lambda order: order[1])


def parse(line):
    order_id, amount = line.strip().split(",")
    return order_id, int(amount)
