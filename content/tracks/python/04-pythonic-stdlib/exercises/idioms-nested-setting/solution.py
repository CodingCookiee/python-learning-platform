def get_setting(config, path, default=None):
    """The value at a dotted path like "database.host", or default if there isn't one."""
    value = config
    try:
        for key in path.split("."):
            value = value[key]
    except (KeyError, TypeError):
        return default
    return value
