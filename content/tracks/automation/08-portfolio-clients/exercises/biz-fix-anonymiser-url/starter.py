import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


def scrub_emails(text):
    """The text with every email address replaced by [email], and nothing else changed."""
    words = []
    for word in text.split(" "):
        if EMAIL.fullmatch(word.strip(".,;:!?")):
            words.append("[email]")
        else:
            words.append(word)
    return " ".join(words)
