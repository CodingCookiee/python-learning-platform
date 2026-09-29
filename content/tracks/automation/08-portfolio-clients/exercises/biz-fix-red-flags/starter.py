RED_FLAGS = {
    "spec": "wants work done on spec, before agreeing to pay",
    "equity": "offers equity instead of payment",
    "free": "expects some of the work for free",
    "unlimited": "expects unlimited changes",
}


def find_red_flags(notes):
    """What each red-flag word in the notes means, in table order."""
    found = []
    for word, meaning in RED_FLAGS.items():
        if word in notes:
            found.append(meaning)
    return found
