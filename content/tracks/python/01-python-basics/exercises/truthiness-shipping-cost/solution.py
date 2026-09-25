def shipping_cost(weight_kg):
    """Return the shipping price for a parcel of weight_kg, or None if it can't be shipped."""
    if 0 < weight_kg <= 1:
        return 3.50
    elif 1 < weight_kg <= 5:
        return 7.00
    elif 5 < weight_kg <= 20:
        return 15.00
    else:
        return None
