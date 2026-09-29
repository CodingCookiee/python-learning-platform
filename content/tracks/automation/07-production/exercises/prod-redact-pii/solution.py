import re

SECRET = re.compile(r"\bsk-[A-Za-z0-9_-]{16,}|(?<=Bearer )[A-Za-z0-9._~+/=-]{16,}")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
CARD = re.compile(r"(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)")
PHONE = re.compile(r"(?<![\w+])(?:\+|0)[\d()\s-]{8,}\d")


def luhn_ok(digits: str) -> bool:
    """The Luhn checksum every real card number passes."""
    total = 0
    for position, char in enumerate(reversed(digits)):
        digit = int(char)
        if position % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return total % 10 == 0


def _card(match: re.Match) -> str:
    digits = re.sub(r"\D", "", match.group())
    return "[CARD]" if luhn_ok(digits) else match.group()


def _phone(match: re.Match) -> str:
    digits = re.sub(r"\D", "", match.group())
    return "[PHONE]" if 10 <= len(digits) <= 15 else match.group()


def redact(text: str) -> str:
    """Replace secrets, email addresses, card numbers and phone numbers with placeholders."""
    text = SECRET.sub("[SECRET]", text)
    text = EMAIL.sub("[EMAIL]", text)
    text = CARD.sub(_card, text)
    return PHONE.sub(_phone, text)
