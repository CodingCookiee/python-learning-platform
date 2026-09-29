def config_lines(lines):
    """The meaningful lines of a config file: stripped, without blanks or # comments."""
    for line in lines:
        line = line.strip()
        if line and not line.startswith("#"):
            yield line
