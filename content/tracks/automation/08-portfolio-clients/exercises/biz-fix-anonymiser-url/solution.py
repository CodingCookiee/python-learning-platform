import re

EMAIL = re.compile(r"[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+")


def scrub_emails(text):
    """The text with every email address replaced by [email], and nothing else changed."""
    return EMAIL.sub("[email]", text)
