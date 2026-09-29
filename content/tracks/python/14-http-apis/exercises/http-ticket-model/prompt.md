The helpdesk API returns tickets like this:

```json
{"id": 4411, "subject": "Refund not received", "status": "open", "priority": "high",
 "created_at": "2026-09-28T14:03:00Z", "assignee": "grace", "tags": ["billing"], "sla_policy": "gold"}
```

Finish the Pydantic model `Ticket`, and write `parse_ticket(response)` that turns an
`httpx.Response` into a `Ticket`:

| Field | Type | If it's missing |
|-------|------|-----------------|
| `id` | int | required |
| `subject` | str | required |
| `status` | `"open"`, `"pending"` or `"closed"` | required |
| `priority` | `"low"`, `"normal"`, `"high"` or `"urgent"` | `"normal"` |
| `created_at` | datetime | required |
| `assignee` | str or None | `None` |
| `tags` | list of str | `[]` |

Any other keys (like `sla_policy`) are ignored. A response that doesn't fit the model raises
Pydantic's `ValidationError`.

```python
ticket = parse_ticket(response)
ticket.id, ticket.priority, ticket.created_at.hour   # (4411, "high", 14)
```
