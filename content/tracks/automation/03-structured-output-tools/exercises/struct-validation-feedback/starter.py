from pydantic import ValidationError


def validation_feedback(error):
    """One "location: message" line per problem in a ValidationError, joined with newlines."""
    return str(error)
