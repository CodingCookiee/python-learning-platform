class ConfigLines:
    """The meaningful lines of a config file: stripped, without blanks or # comments."""

    def __init__(self, lines):
        self._lines = iter(lines)

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            line = next(self._lines)  # raises StopIteration when the input runs out
            line = line.strip()
            if line and not line.startswith("#"):
                return line


def config_lines(lines):
    return ConfigLines(lines)
