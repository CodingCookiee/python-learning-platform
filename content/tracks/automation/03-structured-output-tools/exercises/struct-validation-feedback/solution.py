from pydantic import ValidationError


def validation_feedback(error: ValidationError) -> str:
    """One "location: message" line per problem in a ValidationError, joined with newlines."""
    lines = []
    for problem in error.errors():
        location = ".".join(str(part) for part in problem["loc"]) or "(root)"
        lines.append(f"{location}: {problem['msg']}")
    return "\n".join(lines)
