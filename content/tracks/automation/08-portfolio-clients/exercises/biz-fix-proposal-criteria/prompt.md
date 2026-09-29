`render_deliverables(deliverables)` writes the Deliverables section of your proposals. Each
deliverable is `{"title": ..., "acceptance": [criterion, ...]}`, and each one should be followed by
its own acceptance criteria:

```python
render_deliverables([
    {"title": "Daily sales report",
     "acceptance": ["Arrives by 08:00 on 20 working days in a row",
                    "Totals match the till export to the cent"]},
    {"title": "Low-stock alert",
     "acceptance": ["Posts in Slack within 5 minutes of stock falling below the reorder level"]},
])
```

should return:

```text
## Deliverables

1. Daily sales report
   Accepted when:
   - Arrives by 08:00 on 20 working days in a row
   - Totals match the till export to the cent
2. Low-stock alert
   Accepted when:
   - Posts in Slack within 5 minutes of stock falling below the reorder level
```

The ecommerce shop you sent a proposal to asked why only the last deliverable had any criteria.
Fix the layout, and make the function refuse to write a deliverable with no acceptance criteria:
raise `ValueError` with the message `'<title>' has no acceptance criteria`.
