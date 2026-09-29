import json
import logging
from datetime import datetime, timezone

# Attributes every record has; anything else on a record came from extra={...}
STANDARD = set(vars(logging.makeLogRecord({}))) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    """Formats each record as one line of JSON."""

    def format(self, record):
        when = datetime.fromtimestamp(record.created, tz=timezone.utc)
        entry = {
            "time": when.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key not in STANDARD:
                entry[key] = value
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)
