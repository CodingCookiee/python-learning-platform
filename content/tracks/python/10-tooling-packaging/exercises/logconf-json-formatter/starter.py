import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """Formats each record as one line of JSON."""

    def format(self, record):
        ...
