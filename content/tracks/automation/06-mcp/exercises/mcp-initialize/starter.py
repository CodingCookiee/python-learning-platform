SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"]     # newest first
SERVER_INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}
CAPABILITIES = {"tools": {"listChanged": False}}
INSTRUCTIONS = "Find and describe appointment slots. Booking is done by reception, not by this server."


def handle(message: dict) -> dict | None:
    """Answer initialize and ping; ignore notifications."""
    ...
