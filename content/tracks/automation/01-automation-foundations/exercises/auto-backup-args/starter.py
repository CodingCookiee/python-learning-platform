from datetime import date


def backup_command(database, backup_dir, day):
    """The pg_dump argument list for a custom-format backup of `database` on `day`."""
    return f"pg_dump --format=custom --no-owner --file={backup_dir}/{database}-{day}.dump {database}"
