async def load_dashboard(api, user_id):
    """The user's name, number of open orders and number of unread alerts."""
    profile = await api.profile(user_id)
    orders = await api.orders(user_id)
    alerts = await api.alerts(user_id)
    return {
        "name": profile["name"],
        "open_orders": sum(order["status"] == "open" for order in orders),
        "unread_alerts": sum(not alert["read"] for alert in alerts),
    }
