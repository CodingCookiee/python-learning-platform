from collections import ChainMap


def resolve_settings(cli, env, defaults):
    """A ChainMap of the given flags, then APP_* environment variables, then defaults."""
    ...
