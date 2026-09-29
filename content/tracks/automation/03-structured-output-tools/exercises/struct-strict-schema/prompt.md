Write `strict_schema(schema)` that turns a schema from `model_json_schema()` into one both
providers accept in strict mode. It returns a **new** schema (the input must not change) where
every object schema, at any depth, including the nested models Pydantic puts in `$defs`:

- has `"additionalProperties": False`, and
- lists **all** of its properties in `"required"`, in the order they're defined.

Everything else stays as it is: types, enums, descriptions, `anyOf`, `$ref`, `items`, defaults.

An object schema with no `properties` (what a `dict[str, int]` field produces) can't be made
strict. Raise `ValueError` with a message containing `free-form object`.

```python
class Ticket(BaseModel):
    category: Literal["billing", "shipping"]
    order_id: str | None = None

strict = strict_schema(Ticket.model_json_schema())
strict["required"]               # ["category", "order_id"]
strict["additionalProperties"]   # False
strict["properties"]["order_id"] # {"anyOf": [{"type": "string"}, {"type": "null"}], "default": None, "title": "Order Id"}
```
