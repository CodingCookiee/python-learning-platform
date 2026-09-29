import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+?\(?\d[\d ()-]{7,}\d")


def anonymise(text, names):
    """The text with emails, phone numbers and the given names replaced by placeholders."""
    ...
