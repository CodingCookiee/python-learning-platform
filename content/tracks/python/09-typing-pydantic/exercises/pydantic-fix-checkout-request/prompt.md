The checkout endpoint validates requests with these models, and support has three complaints:

1. Customers without a coupon get `coupon: Field required`, although the coupon is optional.
2. Nobody can check out without writing a gift message, which is meant to be optional too.
3. A cart line with a quantity of `0` gets through and creates an empty order.

Fix the models so that this minimal request is accepted, with `coupon` as `None` and `gift_message`
as `""`, and a quantity of 0 is refused. Keep every other rule: at least one item, and a gift
message of at most 200 characters.

```python
CheckoutRequest.model_validate({"cart_id": "c_981", "items": [{"sku": "MUG-01", "quantity": 1}]})
# CheckoutRequest(cart_id='c_981', items=[CartItem(sku='MUG-01', quantity=1)], coupon=None, gift_message='')
```
