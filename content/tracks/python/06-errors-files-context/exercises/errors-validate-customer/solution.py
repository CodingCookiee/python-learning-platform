class FieldError(ValueError):
    """One problem with one field of a form."""

    def __init__(self, field, problem):
        self.field = field
        self.problem = problem
        super().__init__(f"{field} {problem}")


def validate_customer(record):
    """Return a cleaned copy of record, or raise an ExceptionGroup of every FieldError."""
    errors = []

    name = record.get("name", "").strip()
    if not name:
        errors.append(FieldError("name", "is required"))

    email = record.get("email", "").strip().lower()
    if "@" not in email:
        errors.append(FieldError("email", "must contain @"))

    age = None
    try:
        age = int(record.get("age", ""))
    except ValueError:
        errors.append(FieldError("age", "must be a whole number"))
    else:
        if not 18 <= age <= 120:
            errors.append(FieldError("age", "must be between 18 and 120"))

    if errors:
        raise ExceptionGroup("invalid customer", errors)
    return {"name": name, "email": email, "age": age}
