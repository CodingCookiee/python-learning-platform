import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+?\(?\d[\d ()-]{7,}\d")


def phone(match):
    number = match.group()
    return "[phone]" if sum(ch.isdigit() for ch in number) >= 9 else number


def anonymise(text, names):
    """The text with emails, phone numbers and the given names replaced by placeholders."""
    text = EMAIL.sub("[email]", text)
    text = PHONE.sub(phone, text)
    if names:
        lookup = {name.lower(): placeholder for name, placeholder in names.items()}
        alternatives = "|".join(re.escape(name) for name in sorted(names, key=len, reverse=True))
        pattern = re.compile(rf"(?<!\w)(?:{alternatives})(?!\w)", re.IGNORECASE)
        text = pattern.sub(lambda match: lookup[match.group().lower()], text)
    return text
