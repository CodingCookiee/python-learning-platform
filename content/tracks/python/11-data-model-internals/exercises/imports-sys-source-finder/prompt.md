The pricing service from the previous drill now keeps whole packages of rule modules in its
database. Rather than building modules by hand, plug into the import system: write a class
`SourceFinder(sources)`, where `sources` maps full module names to source text, that works as both
a **finder** and a **loader** on `sys.meta_path`:

- `find_spec(name, path, target=None)` returns a module spec for a name in `sources`, whose loader
  is the finder itself, and `None` for any other name, so normal imports carry on untouched.
- A name is a **package** when another name in `sources` starts with it followed by a dot, so
  `"shop.pricing"` makes `"shop"` a package and `import shop.pricing` works.
- `create_module(spec)` returns `None` (use the default module), and `exec_module(module)` runs
  that module's source in it.

```python
finder = SourceFinder({
    "shop": "",
    "shop.pricing": "VAT = 0.2\n\ndef gross(net):\n    return round(net * (1 + VAT), 2)\n",
})
sys.meta_path.insert(0, finder)

import shop.pricing
shop.pricing.gross(50)                  # 60.0
shop.pricing.__spec__.loader is finder  # True
import json                             # still found the normal way
```
