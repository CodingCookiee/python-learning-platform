The ticket classifier returns a label and a confidence. Write `route(label, confidence,
threshold=0.75)` that decides where the ticket goes:

- to `"human_review"` if the label is `"unknown"`, or the confidence is below the threshold,
- otherwise to the queue named by the label.

```python
route("shipping", 0.93)          # "shipping"
route("billing", 0.55)           # "human_review"
route("unknown", 0.99)           # "human_review"
route("billing", 0.55, threshold=0.5)   # "billing"
```
