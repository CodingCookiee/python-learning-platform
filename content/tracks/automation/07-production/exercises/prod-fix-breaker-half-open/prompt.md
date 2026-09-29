The support bot wraps every model call in a `CircuitBreaker`. During Tuesday's outage it opened
at 14:05, as it should, and sent everyone to the cached answers. The provider recovered at 14:20,
but the breaker stayed open until someone restarted the service at 16:40: with a steady stream of
questions arriving, it never let a single trial call through. And when it finally closed, one
failed call opened it again straight away.

Fix `CircuitBreaker` so it behaves as its docstring says:

- Once open, it refuses calls (raising `CircuitOpen` without calling `fn`) only until `cooldown`
  seconds after it **opened**, however many calls it refuses in the meantime.
- After the cool-down, the next call is a trial (half-open). Success closes the breaker; failure
  opens it again, with the cool-down counted from that failure.
- Once closed, it counts consecutive failures from zero again.

```python
now = [0.0]
breaker = CircuitBreaker(failure_threshold=3, cooldown=30, clock=lambda: now[0])
# three failures at 0, 1 and 2 s open it; calls at 10, 20 and 30 s are refused
now[0] = 32
breaker.call(lambda: "Refunds take 14 days.")   # the trial goes through: 30 s after it opened
breaker.state                                    # "closed"
```
