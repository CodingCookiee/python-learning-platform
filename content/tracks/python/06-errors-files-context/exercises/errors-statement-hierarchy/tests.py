from plp import test, hidden
from solution import BalanceMismatch, ParseError, StatementError, UnknownAccount


@test("ParseError is a StatementError and a ValueError")
def _():
    assert issubclass(ParseError, StatementError)
    assert issubclass(ParseError, ValueError)


@test("UnknownAccount is a StatementError and a LookupError")
def _():
    assert issubclass(UnknownAccount, StatementError)
    assert issubclass(UnknownAccount, LookupError)


@test("BalanceMismatch is a StatementError and nothing else")
def _():
    assert issubclass(BalanceMismatch, StatementError)
    assert not issubclass(BalanceMismatch, ValueError)
    assert not issubclass(BalanceMismatch, LookupError)


@test("One except StatementError clause catches all three")
def _():
    for error in (ParseError("line 4: no amount"), UnknownAccount("GB29 NWBK"), BalanceMismatch("off by 0.01")):
        assert isinstance(error, StatementError), f"except StatementError wouldn't catch a {type(error).__name__}"


@hidden("StatementError is an ordinary Exception")
def _():
    assert StatementError.__bases__ == (Exception,)
    assert not issubclass(ParseError, LookupError)
    assert not issubclass(UnknownAccount, ValueError)
