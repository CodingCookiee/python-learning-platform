import re

EMAIL = re.compile(r"([\w.+-])[\w.+-]*@([\w-]+(?:\.[\w-]+)+)")


def mask_emails(text):
    """text with each email address masked, like r***@rain.one."""
    return EMAIL.sub(r"\1***@\2", text)
