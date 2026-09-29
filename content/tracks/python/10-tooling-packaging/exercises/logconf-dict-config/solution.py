import logging


def logging_config(stream, verbose=False):
    """The dict for logging.config.dictConfig: everything at INFO (DEBUG if verbose) to stream."""
    level = "DEBUG" if verbose else "INFO"
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "plain": {"format": "%(levelname)s %(name)s: %(message)s"},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": stream,
                "formatter": "plain",
                "level": level,
            },
        },
        "loggers": {
            "httpx": {"level": "WARNING"},
            "httpcore": {"level": "WARNING"},
        },
        "root": {"level": level, "handlers": ["console"]},
    }
