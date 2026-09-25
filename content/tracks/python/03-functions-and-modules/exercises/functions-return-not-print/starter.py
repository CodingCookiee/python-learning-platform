def shipping_cost(weight_kg):
    """Return the shipping cost in pounds for a parcel weighing weight_kg."""
    if weight_kg <= 2:
        print(4.99)
    else:
        print(round(4.99 + (weight_kg - 2) * 1.25, 2))


def order_total(subtotal, weight_kg):
    """Return subtotal plus shipping, rounded to cents."""
    round(subtotal + shipping_cost(weight_kg), 2)
