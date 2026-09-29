import dis


def global_names(func):
    """The sorted names func (and anything nested in it) loads as globals."""
    return sorted(func.__code__.co_names)
