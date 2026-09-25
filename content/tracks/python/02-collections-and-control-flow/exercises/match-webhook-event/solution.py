def handle_event(event):
    """Describe how to handle a webhook event dict."""
    match event:
        case {"type": "order.created", "order": {"id": str(order_id), "total": int(total) | float(total)}}:
            return f"New order {order_id}: {total:.2f}"
        case {
            "type": "order.refunded",
            "order": {"id": str(order_id)},
            "amount": int(amount) | float(amount),
        } if amount > 0:
            return f"Refund {amount:.2f} on {order_id}"
        case {"type": "customer.deleted", "customer_id": str(customer_id)}:
            return f"Delete customer {customer_id}"
        case {"type": str(kind)}:
            return f"Ignored event: {kind}"
        case _:
            return "Malformed event"
