import json
import logging

logger = logging.getLogger("kiln_mcp.stdio")


def serve(handle, stdin, stdout) -> None:
    """Run handle over newline-delimited JSON-RPC on stdin and stdout, until stdin ends."""
    ...
