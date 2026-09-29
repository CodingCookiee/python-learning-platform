Checkout code wants to treat the *class* `PaymentMethod` as the collection of every payment method
the shop supports, the way `enum` lets you loop over an `Enum`: `len(PaymentMethod)`,
`"card" in PaymentMethod`, `PaymentMethod["card"]` and `for method in PaymentMethod`. Special
methods are looked up on the type, so for a class that means its metaclass. Write `RegistryMeta`:

- A class created with `metaclass=RegistryMeta` (and no base that already has it) is a **root**
  with its own, empty registry.
- Each subclass that sets `code` in its own body is registered with its root under that code. A
  subclass without its own `code` isn't registered. Reusing a code within a family raises
  `TypeError` when the class is defined.
- On any class in the family: `len()` counts the registered classes, `in` checks a code,
  `[code]` returns the class (a `KeyError` if there isn't one), and iterating gives the classes in
  the order they were defined.
- Separate roots keep separate registries.

```python
class PaymentMethod(metaclass=RegistryMeta):
    pass

class Card(PaymentMethod):
    code = "card"

class BankTransfer(PaymentMethod):
    code = "bank"

len(PaymentMethod)             # 2
"card" in PaymentMethod        # True
PaymentMethod["bank"]          # <class 'BankTransfer'>
list(PaymentMethod)            # [Card, BankTransfer]
```
