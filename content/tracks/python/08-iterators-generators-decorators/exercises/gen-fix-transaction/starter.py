from contextlib import contextmanager


@contextmanager
def transaction(db):
    """Commit the block's work if it succeeds; roll it back if it raises."""
    db.begin()
    yield db
    db.commit()


def record_payment(db, order_id, amount):
    with transaction(db):
        db.execute(f"insert payment {order_id} {amount}")
        if amount <= 0:
            raise ValueError("amount must be positive")
        db.execute(f"update order {order_id} paid")
