class StatementError(Exception):
    """Anything wrong with an imported bank statement."""


class ParseError(Exception):
    """A line of the statement couldn't be read."""


class UnknownAccount(Exception):
    """The statement is for an account we don't hold."""


class BalanceMismatch(Exception):
    """The transactions don't add up to the closing balance."""
