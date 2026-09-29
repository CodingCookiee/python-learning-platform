from collections.abc import Mapping
from typing import overload


def get_setting(env, name, default=None):
    """A setting from env: as text, or as an int when the default is an int."""
    ...
