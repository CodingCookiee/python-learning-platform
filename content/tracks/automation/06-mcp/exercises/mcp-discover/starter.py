META = "io.modelcontextprotocol/"
SUPPORTED_VERSIONS = ["2026-07-28"]
SERVER_INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}
CAPABILITIES = {"tools": {}}
INSTRUCTIONS = "Find and describe appointment slots. Booking is done by reception, not by this server."
TOOLS = [{"name": "find_slots", "description": "Free appointment slots for one practitioner on one day.",
          "inputSchema": {"type": "object", "properties": {"practitioner": {"type": "string"}, "day": {"type": "string"}},
                          "required": ["practitioner", "day"]}}]


def handle(message: dict) -> dict | None:
    """Check every request's _meta, then answer server/discover and tools/list."""
    ...
