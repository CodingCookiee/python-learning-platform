# this function works out the late fee, 2% a day, max 25%
def late_fee(amount_due, days_late):
    if days_late <= 0:
        return 0.0
    fee = amount_due * 0.02 * days_late
    return round(min(fee, amount_due * 0.25), 2)
