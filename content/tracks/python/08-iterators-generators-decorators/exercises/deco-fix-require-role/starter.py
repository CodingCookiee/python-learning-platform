from functools import wraps


def require_role(role):
    """Only let users with this role call the function. The user is always the first argument."""

    def wrapper(user, *args, **kwargs):
        if role not in user["roles"]:
            raise PermissionError(f"{user['name']} needs the {role} role")
        return func(user, *args, **kwargs)

    return wrapper


@require_role("admin")
def delete_customer(user, customer_id):
    """Permanently delete a customer record."""
    return f"{user['name']} deleted {customer_id}"


@require_role("billing")
def issue_refund(user, order_id, amount):
    """Refund an order."""
    return f"{user['name']} refunded {amount:.2f} on {order_id}"
