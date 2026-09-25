def shipping_label(order):
    """Return a four-line shipping label for (order_id, name, (street, city, postcode))."""
    order_id, name, (street, city, postcode) = order
    return f"{name}\n{street}\n{city} {postcode}\nOrder {order_id}"
