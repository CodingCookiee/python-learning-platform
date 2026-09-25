def shipping_label(order):
    """Return a four-line shipping label for (order_id, name, (street, city, postcode))."""
    return (
        order[1] + "\n"
        + order[2][0] + "\n"
        + order[2][1] + " " + order[2][2] + "\n"
        + "Order " + order[0]
    )
