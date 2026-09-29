`checkout(order, payments, mailer)` charges the customer, emails the receipt and returns it.
Someone made it "faster" by sending the email in the background. Since then, customers complain
that some receipts never arrive, and when the mail server rejects an address nobody finds out:

```python
receipt = await checkout(order, payments, mailer)
mailer.sent        # [] : checkout has returned, but the receipt hasn't been sent
```

Fix `checkout` so that when it returns, the receipt has been sent, and if sending it fails,
`checkout` raises that error. It still returns the receipt from `payments.charge`.

```python
await checkout({"id": "A-1042", "total": 34.0, "email": "ada@example.com"}, payments, mailer)
# {"order": "A-1042", "amount": 34.0, "charge_id": "ch_A-1042"}
mailer.sent      # [("ada@example.com", "ch_A-1042")]
```
