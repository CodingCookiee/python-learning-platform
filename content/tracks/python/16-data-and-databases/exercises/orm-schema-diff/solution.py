from sqlalchemy import inspect

IGNORED_TABLES = {"alembic_version"}


def schema_diff(engine, metadata):
    """Sorted list of 'add table t', 'drop table t', 'add column t.c' and 'drop column t.c' strings."""
    inspector = inspect(engine)
    in_database = set(inspector.get_table_names()) - IGNORED_TABLES
    in_models = set(metadata.tables) - IGNORED_TABLES
    changes = [f"add table {name}" for name in in_models - in_database]
    changes += [f"drop table {name}" for name in in_database - in_models]
    for name in in_models & in_database:
        model_columns = {column.name for column in metadata.tables[name].columns}
        database_columns = {column["name"] for column in inspector.get_columns(name)}
        changes += [f"add column {name}.{column}" for column in model_columns - database_columns]
        changes += [f"drop column {name}.{column}" for column in database_columns - model_columns]
    return sorted(changes)
