from datetime import date


def backup_command(database, backup_dir, day):
    """The pg_dump argument list for a custom-format backup of `database` on `day`."""
    target = f"{backup_dir}/{database}-{day.isoformat()}.dump"
    return ["pg_dump", "--format=custom", "--no-owner", f"--file={target}", database]
