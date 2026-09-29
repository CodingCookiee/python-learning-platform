A savings account inherits from a base account that has a `__getattr__` fallback. Follow each
attribute read to where it's found, and watch for the lines where `__getattr__` runs (it prints
when it does). Type exactly what the program prints.
