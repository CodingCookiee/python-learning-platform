class FieldError(ValueError):
    """One problem with one field of a form."""

    def __init__(self, field, problem):
        self.field = field
        self.problem = problem
        super().__init__(f"{field} {problem}")


def validate_customer(record):
    """Return a cleaned copy of record, or raise an ExceptionGroup of every FieldError."""
    ...
