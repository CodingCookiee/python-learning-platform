A bank-statement importer raises four exceptions, but they're all unrelated subclasses of
`Exception`, so a caller can't catch "anything wrong with the statement" in one clause. Change the
base classes so they form this hierarchy:

```text
StatementError              anything wrong with an imported statement
 ├── ParseError             a line couldn't be read (also a ValueError)
 ├── UnknownAccount         the statement is for an account we don't hold (also a LookupError)
 └── BalanceMismatch        the transactions don't add up to the closing balance
```

```python
issubclass(ParseError, StatementError)     # True
issubclass(ParseError, ValueError)         # True
issubclass(UnknownAccount, LookupError)    # True
issubclass(BalanceMismatch, ValueError)    # False
```

Keep the class names and docstrings as they are.
