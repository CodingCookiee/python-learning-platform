A chat bot's commands are classes, and the help text lists them by `name`. A command without a
name only shows up as a blank line in production. Make the mistake fail at import instead: give
`Command` an `__init_subclass__` so that defining a subclass whose `name` isn't a non-empty string
raises `TypeError` naming the class. A subclass may inherit its name from a parent command.
`Command` itself needs no name.

```python
class Refund(Command):
    name = "refund"

class PartialRefund(Refund):    # inherits "refund": fine
    pass

class Broken(Command):          # TypeError: Broken must define a name
    pass
```
