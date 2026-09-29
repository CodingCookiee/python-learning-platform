class FieldError(ValueError):
    """One problem with one field of a form."""

    def __init__(self, field, problem):
        self.field = field
        self.problem = problem
        super().__init__(f"{field} {problem}")


def validate_customer(record):
    """Return a cleaned copy of record, or raise an ExceptionGroup of every FieldError."""
    if not isinstance(record, dict):
        raise TypeError(f"each record must be a dict, got {type(record).__name__}")
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


def import_customers(records):
    """Return (accepted, rejected): the cleaned good records, and a "row <n>: <problem>"
    message for every problem in the bad ones."""
    accepted, rejected = [], []
    for number, record in enumerate(records, start=1):
        try:
            accepted.append(validate_customer(record))
        except FieldError as error:
            rejected.append(f"row {number}: {error}")
    return accepted, rejected
