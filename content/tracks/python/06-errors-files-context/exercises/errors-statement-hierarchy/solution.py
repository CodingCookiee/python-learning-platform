class StatementError(Exception):
    """Anything wrong with an imported bank statement."""


class ParseError(StatementError, ValueError):
    """A line of the statement couldn't be read."""


class UnknownAccount(StatementError, LookupError):
    """The statement is for an account we don't hold."""


class BalanceMismatch(StatementError):
    """The transactions don't add up to the closing balance."""
