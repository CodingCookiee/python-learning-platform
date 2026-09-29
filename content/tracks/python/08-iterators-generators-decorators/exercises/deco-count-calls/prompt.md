The API team wants to know how often each endpoint handler is used. Write a decorator
`count_calls(func)` that:

- passes every positional and keyword argument through to `func` and returns its result,
- counts the calls in an attribute `calls` on the decorated function, starting at 0,
- keeps the function's name and docstring, using `functools.wraps`.

```python
@count_calls
def list_orders(customer_id, *, status="open"):
    """Orders for one customer."""
    return f"{status} orders for {customer_id}"

list_orders("C1")                     # "open orders for C1"
list_orders("C2", status="shipped")   # "shipped orders for C2"
list_orders.calls                     # 2
list_orders.__name__                  # "list_orders"
```
