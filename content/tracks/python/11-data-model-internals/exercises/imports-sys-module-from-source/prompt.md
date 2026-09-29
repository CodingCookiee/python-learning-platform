A pricing service stores its discount rules as Python source in a database, and wants each rule
set to behave like a normal module once it's loaded. Write `module_from_source(name, source)`:

- It creates a new module object called `name`, runs `source` in it, and returns it.
- Once it has returned, `import name` anywhere in the program gets that same module.
- It follows the import system's order: the module is registered in `sys.modules` **before** its
  code runs, and if the code raises, the entry is removed again and the exception propagates.
- If a module called `name` is already loaded, it raises `ValueError` and leaves that module alone.

```python
rules = module_from_source("spring_rules", """
RATE = 0.2

def discounted(price):
    return round(price * (1 - RATE), 2)
""")

rules.discounted(50)            # 40.0
import spring_rules
spring_rules is rules           # True
```
