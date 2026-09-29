import re


def normalise(text):
    return re.sub(r"\s+", " ", text).strip().strip(".!").casefold()


def exact(output, expected):
    return normalise(output) == normalise(expected)


def contains(output, phrases):
    return all(phrase.casefold() in output.casefold() for phrase in phrases)


def matches(output, pattern):
    return re.search(pattern, output) is not None


def within(output, expected, tolerance):
    match = re.search(r"-?\d[\d,]*(?:\.\d+)?", output)
    return match is not None and abs(float(match.group().replace(",", "")) - expected) <= tolerance


checks = [
    ("exact", exact("Shipping.", "shipping")),
    ("exact", exact("Shipping query", "shipping")),
    ("contains", contains("Refunds take 14 working days", ["14 days"])),
    ("contains", contains("REFUND within 14 DAYS", ["refund", "14 days"])),
    ("regex", matches("Your order is SO-10423", r"SO-\d{4}\b")),
    ("regex", matches("Your order is SO-1042.", r"SO-\d{4}\b")),
    ("numeric", within("Total: 1,240.50", 1240.5, 0.01)),
    ("numeric", within("2 items, total 1240.50", 1240.5, 0.01)),
]
for name, passed in checks:
    print(f"{name:<9}{'PASS' if passed else 'fail'}")
