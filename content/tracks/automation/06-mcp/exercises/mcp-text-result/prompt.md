Every tool on the order-desk server returns its result the same way, so write the helper once:

```python
text_result(value, *, is_error=False) -> dict
```

It returns a `tools/call` result with a single text content block and the `isError` flag. A string
is used as the text as it is; anything else is turned into JSON with `json.dumps(value, default=str)`
(so dates and decimals don't crash it).

```python
text_result({"order_id": "1042", "status": "shipped"})
# {"content": [{"type": "text", "text": '{"order_id": "1042", "status": "shipped"}'}], "isError": False}

text_result("Order 9999 not found", is_error=True)
# {"content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True}
```
