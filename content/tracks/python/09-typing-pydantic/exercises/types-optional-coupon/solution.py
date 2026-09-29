COUPONS: dict[str, int] = {"WELCOME10": 10, "VIP25": 25}


def coupon_discount(code: str | None) -> int:
    """The discount percentage for a coupon code, or 0 when there's no valid code."""
    if code is None:
        return 0
    return COUPONS.get(code.strip().upper(), 0)
