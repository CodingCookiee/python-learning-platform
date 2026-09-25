from collections import ChainMap

PREFIX = "APP_"


def resolve_settings(cli, env, defaults):
    """A ChainMap of the given flags, then APP_* environment variables, then defaults."""
    flags = {key: value for key, value in cli.items() if value is not None}
    from_env = {
        key.removeprefix(PREFIX).lower(): value
        for key, value in env.items()
        if key.startswith(PREFIX)
    }
    return ChainMap(flags, from_env, defaults)
