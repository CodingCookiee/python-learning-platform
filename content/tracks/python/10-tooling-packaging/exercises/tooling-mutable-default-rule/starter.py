import ast
import re


def find_mutable_defaults(source):
    """One "line:col: B006 ..." message per mutable default argument, sorted by position."""
    ...
