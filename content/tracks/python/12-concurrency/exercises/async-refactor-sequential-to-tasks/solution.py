import asyncio


async def load_dashboard(api, user_id):
    """The user's name, number of open orders and number of unread alerts."""
    profile_task = asyncio.create_task(api.profile(user_id))
    orders_task = asyncio.create_task(api.orders(user_id))
    alerts_task = asyncio.create_task(api.alerts(user_id))
    profile = await profile_task
    orders = await orders_task
    alerts = await alerts_task
    return {
        "name": profile["name"],
        "open_orders": sum(order["status"] == "open" for order in orders),
        "unread_alerts": sum(not alert["read"] for alert in alerts),
    }
