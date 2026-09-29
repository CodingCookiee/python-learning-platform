import re
from decimal import ROUND_HALF_UP, Decimal

EMAIL = re.compile(r"[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+?\(?\d[\d ()-]{7,}\d")


def anonymise(text, names):
    """The text with emails, phone numbers and the given names replaced by placeholders."""
    text = EMAIL.sub("[email]", text)
    text = PHONE.sub(lambda m: "[phone]" if sum(ch.isdigit() for ch in m.group()) >= 9 else m.group(), text)
    if names:
        lookup = {name.lower(): placeholder for name, placeholder in names.items()}
        alternatives = "|".join(re.escape(name) for name in sorted(names, key=len, reverse=True))
        pattern = re.compile(rf"(?<!\w)(?:{alternatives})(?!\w)", re.IGNORECASE)
        text = pattern.sub(lambda m: lookup[m.group().lower()], text)
    return text


def change_percent(before, after):
    return int((Decimal(after - before) / Decimal(before) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def before_after(label, before, after, unit):
    line = f"{label}: {before} → {after} {unit}"
    return line if before == 0 else f"{line} ({change_percent(before, after):+}%)"


def render_case_study(study, names):
    """A markdown case study: the result first, then the problem and the approach, with nobody named."""
    ...
