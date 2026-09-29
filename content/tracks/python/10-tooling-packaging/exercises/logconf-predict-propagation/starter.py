import logging
import logging.config


def stdout_handler(label, level="NOTSET"):
    return {"class": "logging.StreamHandler", "stream": "ext://sys.stdout", "formatter": label, "level": level}


logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        label: {"format": f"[{label}] %(levelname)s %(name)s: %(message)s"}
        for label in ("console", "audit", "payments")
    },
    "handlers": {
        "console": stdout_handler("console"),
        "audit": stdout_handler("audit", level="WARNING"),
        "payments": stdout_handler("payments"),
    },
    "loggers": {
        "shop": {"level": "INFO", "handlers": ["audit"]},
        "shop.payments": {"handlers": ["payments"], "propagate": False},
    },
    "root": {"level": "WARNING", "handlers": ["console"]},
})

orders = logging.getLogger("shop.orders")
payments = logging.getLogger("shop.payments")
warehouse = logging.getLogger("warehouse")

orders.debug("Basket updated")
orders.info("Order 1042 placed")
orders.error("Order 1043 failed")
payments.info("Card charged")
warehouse.info("Stock counted")
warehouse.warning("Low stock: MUG-STN")
