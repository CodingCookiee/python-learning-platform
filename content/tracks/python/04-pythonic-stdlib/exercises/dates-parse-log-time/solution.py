from datetime import datetime

LOG_TIME_FORMAT = "%d/%b/%Y:%H:%M:%S %z"


def parse_log_time(text):
    """An aware datetime for a log timestamp like "25/Sep/2026:14:03:07 +0000"."""
    return datetime.strptime(text, LOG_TIME_FORMAT)
