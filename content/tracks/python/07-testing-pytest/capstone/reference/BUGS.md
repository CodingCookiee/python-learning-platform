# Bugs found in pricing.py

## 1. Exactly 10 of a product don't get the bulk discount

- **Rule:** 10 or more of one product take 5% off that line.
- **Test:** `test_line_total[10 take 5% off]`
- **Expected:** `line_total(Decimal("2.00"), 10)` is `19.00`. **Actual:** `20.00`.
- **Fix:** `quantity > BULK_QUANTITY` became `quantity >= BULK_QUANTITY` in `line_total`.

## 2. Coupon discounts round half to even, not half up

- **Rule:** a coupon's discount is rounded half-up to the penny.
- **Test:** `test_coupon_discount_rounds_half_up`
- **Expected:** 10% of `10.25` is `1.03`. **Actual:** `1.02`, because `quantize` defaults to
  `ROUND_HALF_EVEN`.
- **Fix:** passed `rounding=ROUND_HALF_UP` to `quantize` in `coupon_discount`.

## 3. Free shipping is decided before the coupon discount

- **Rule:** shipping is free when the goods come to 50.00 or more after the coupon discount.
- **Test:** `test_free_shipping_is_decided_after_the_discount`
- **Expected:** goods of 55.50 less a 5.55 discount (49.95) pay 3.95 shipping, for a total of
  `64.68`. **Actual:** shipping `0.00` and a total of `59.94`.
- **Fix:** `quote` passes `subtotal - discount` to `shipping_cost` instead of `subtotal`.
