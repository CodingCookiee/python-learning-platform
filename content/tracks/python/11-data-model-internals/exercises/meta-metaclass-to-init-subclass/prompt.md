Report plugins register themselves through a metaclass. It works, but when the team tried to add
an abstract base for table-shaped plugins it broke:

```python
from abc import ABC, abstractmethod

class TabularPlugin(Plugin, ABC):
    ...
# TypeError: metaclass conflict: the metaclass of a derived class must be a (non-strict)
# subclass of the metaclasses of all its bases
```

The metaclass only registers and checks subclasses, which is `__init_subclass__`'s job. Replace
`PluginMeta` with an `__init_subclass__` method on `Plugin`, keeping the behaviour:

- A subclass that sets its own `name` is registered under it; `get_plugin(name)` returns a new
  instance and `plugin_names()` lists the names, sorted.
- A subclass that doesn't set a name (like an abstract base) isn't registered.
- Setting a name that's already registered raises `TypeError` when the class is defined.

No metaclass may be left: `type(Plugin)` must be plain `type`, and `TabularPlugin` above must work.
