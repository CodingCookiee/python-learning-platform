import logging
import time
from contextlib import contextmanager

log = logging.getLogger(__name__)


@contextmanager
def logged_job(name, clock=time.monotonic):
    """Log when a job starts and how it ends, including the traceback if it fails."""
    log.info("%s started", name)
    started = clock()
    try:
        yield
    except Exception:
        log.exception("%s failed after %.1fs", name, clock() - started)
        raise
    log.info("%s finished in %.1fs", name, clock() - started)
