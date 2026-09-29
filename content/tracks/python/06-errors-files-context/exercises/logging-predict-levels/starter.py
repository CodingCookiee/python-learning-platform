import logging
import sys

logging.basicConfig(
    stream=sys.stdout,
    level=logging.WARNING,
    format="%(levelname)s %(name)s: %(message)s",
    force=True,
)

payments = logging.getLogger("payments")
payments.setLevel(logging.NOTSET)
refunds = logging.getLogger("payments.refunds")
refunds.setLevel(logging.NOTSET)

payments.debug("connecting to the gateway")
payments.info("charging card ending %s", "4242")
payments.warning("retrying charge %s", "P-1001")

payments.setLevel(logging.INFO)
payments.info("charged %s", "P-1001")
refunds.debug("refund %s queued", "R-77")
refunds.info("refund %s sent", "R-77")
refunds.error("refund %s failed", "R-78")
print("done")
