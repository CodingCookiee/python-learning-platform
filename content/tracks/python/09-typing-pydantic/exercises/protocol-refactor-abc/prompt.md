`checkout` accepts any `PaymentGateway`, an abstract base class. `PayFastClient` comes from the
payment provider's SDK and can't inherit from your ABC, so someone wrote `PayFastAdapter`: a class
whose only job is to forward one method call. Every new provider will need another adapter.

Refactor `PaymentGateway` into a `Protocol` so that anything with a matching `charge` method is a
gateway, and delete the adapter. Afterwards, this should type-check and work:

```python
checkout(PayFastClient(), "A1042", 1600)   # "pf_A1042_1600"
```

Don't change `PayFastClient` or `checkout`. No `ABC` or `abstractmethod` should be left,
`mypy --strict` must pass, and mypy must still reject a gateway that isn't one.
