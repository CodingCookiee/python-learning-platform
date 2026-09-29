The nightly import job processes millions of orders, and like many batch jobs it switches off the
cycle collector with `gc.disable()` to run faster. Its memory climbs all night until it's killed:
no `Order` is ever freed, even after the job has finished with it.

```python
import gc, weakref
gc.disable()

order = Order("A1042")
order.add_line("MUG-01", 2, 8.50)
watcher = weakref.ref(order)
del order
watcher()      # still the Order  ← should be None: nothing uses it any more
```

Fix `Order` and `OrderLine` so that an order and its lines are freed as soon as the last reference
to the order goes, with the collector still off. Everything else must keep working:

- `line.order` gives the line's order while the order exists, and `line.total` works as before.
- Once the order has been freed, `line.order` is `None` (a line kept on its own doesn't keep its
  order alive).
- `order.total()` and `order.lines` are unchanged.
