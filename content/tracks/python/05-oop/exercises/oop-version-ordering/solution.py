from functools import total_ordering


@total_ordering
class Version:
    def __init__(self, text):
        parts = [int(part) for part in text.removeprefix("v").split(".")]
        if len(parts) > 3:
            raise ValueError(f"Too many parts in version {text!r}")
        self.major, self.minor, self.patch = parts + [0] * (3 - len(parts))

    def _key(self):
        return (self.major, self.minor, self.patch)

    def __str__(self):
        return ".".join(str(part) for part in self._key())

    def __repr__(self):
        return f"Version({str(self)!r})"

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() == other._key()

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() < other._key()

    def __hash__(self):
        return hash(self._key())

    def bump(self, part):
        major, minor, patch = self._key()
        match part:
            case "major":
                return Version(f"{major + 1}.0.0")
            case "minor":
                return Version(f"{major}.{minor + 1}.0")
            case "patch":
                return Version(f"{major}.{minor}.{patch + 1}")
        raise ValueError(f"Unknown part {part!r}")
