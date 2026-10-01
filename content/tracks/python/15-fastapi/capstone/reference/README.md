# Tidewater bookings

Bookings behind API keys, and a webhook that Paygate calls when a payment succeeds or is refunded.

    uv run pytest
    uv run uvicorn service:app_from_env --factory --reload

Set `TIDEWATER_API_KEYS` (comma-separated) and `TIDEWATER_WEBHOOK_SECRET` first.
