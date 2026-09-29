from sqlalchemy import inspect


def schema_diff(engine, metadata):
    """Sorted list of 'add table t', 'drop table t', 'add column t.c' and 'drop column t.c' strings."""
    ...
