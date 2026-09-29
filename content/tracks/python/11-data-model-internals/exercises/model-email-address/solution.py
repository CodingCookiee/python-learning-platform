class EmailAddress:
    """An email address: case-sensitive local part, case-insensitive domain. Immutable and hashable."""

    def __init__(self, text):
        local, at, domain = text.rpartition("@")
        if not at or not local or not domain:
            raise ValueError(f"not an email address: {text!r}")
        object.__setattr__(self, "_local", local)
        object.__setattr__(self, "_domain", domain.lower())

    @property
    def local(self):
        return self._local

    @property
    def domain(self):
        return self._domain

    def __setattr__(self, name, value):
        raise AttributeError(f"EmailAddress is immutable: can't set {name!r}")

    def __str__(self):
        return f"{self.local}@{self.domain}"

    def __repr__(self):
        return f"EmailAddress({str(self)!r})"

    def _key(self):
        return (self.local, self.domain)

    def __eq__(self, other):
        if not isinstance(other, EmailAddress):
            return NotImplemented
        return self._key() == other._key()

    def __hash__(self):
        return hash(self._key())
