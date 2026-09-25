Write an abstract `Notifier` base class and two concrete notifiers.

`Notifier` (an `ABC`):

- `send(recipient, message)` is abstract: every subclass must implement it, and it returns a
  string describing what it delivered.
- `sent` is a list, one per notifier, of everything that notifier has delivered.
- `notify(recipient, message)` calls `send`, records the result in `sent` and returns it.
- `broadcast(recipients, message)` notifies each recipient once, in order, skipping repeats, and
  returns the list of results.

The notifiers:

- `EmailNotifier.send` returns `"email to <recipient>: <message>"`, and raises `ValueError` if the
  recipient has no `@`.
- `SmsNotifier.send` returns `"sms to <recipient>: <message>"`, with a message longer than 160
  characters cut to its first 157 followed by `"..."`.

```python
email = EmailNotifier()
email.broadcast(["ada@example.com", "grace@example.com", "ada@example.com"], "Invoice ready")
# ["email to ada@example.com: Invoice ready", "email to grace@example.com: Invoice ready"]
len(email.sent)   # 2

Notifier()        # TypeError: can't instantiate an abstract class
```
