def order_message(status):
    """Return the customer-facing message for an order status."""
    match status:
        case "pending":
            return "Waiting for payment"
        case "paid":
            return "Preparing your order"
        case "shipped":
            return "On its way"
        case "delivered":
            return "Delivered"
        case _:
            return f"Unknown status: {status}"
