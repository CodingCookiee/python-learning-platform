def mask_card(number):
    """Return the card's digits with all but the last four replaced by "*"."""
    digits = number.replace(" ", "").replace("-", "")
    return "*" * (len(digits) - 4) + digits[-4:]
