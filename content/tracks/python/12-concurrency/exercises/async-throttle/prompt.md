The SMS provider allows bursts: at most `limit` messages in any `period` seconds. Spacing every
message out evenly, like the lesson's `Throttle`, would waste the burst. Write a class
`Throttle(limit, period)` with one coroutine method, `wait()`:

- `await throttle.wait()` returns when the caller may start. However many callers share the
  throttle, at most `limit` of them start within any window of `period` seconds.
- A caller who arrives while the window has room doesn't wait at all.
- A caller who arrives when it's full waits, with `asyncio.sleep`, until the oldest start in the
  window is `period` seconds old.

Use the event loop's clock, `asyncio.get_running_loop().time()`.

```python
throttle = Throttle(limit=2, period=0.1)

async def send_sms(number):
    await throttle.wait()
    ...

await asyncio.gather(*(send_sms(n) for n in numbers))    # six messages
# two start straight away, two at 0.1 s, two at 0.2 s
```
