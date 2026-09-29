The hotel's booking page asks for a price before the guest commits. Build
`GET /rooms/{room_number}/quote`.

**Parameters**

| Where | Name | Rules |
|-------|------|-------|
| path | `room_number` | an integer from 100 to 399 |
| query | `check_in` | a date such as `2026-10-01`, required |
| query | `nights` | an integer from 1 to 14, default `1` |
| query | `extra` | repeatable: `?extra=breakfast&extra=parking`. Each one must be `breakfast`, `parking` or `late-checkout`. Default: none |

Anything that breaks a rule is refused with `422`.

**Pricing**, in whole euros: the room's nightly rate comes from `RATES_BY_FLOOR` (room 204 is on
floor 2). `breakfast` and `parking` are charged per night; `late-checkout` is charged once. Asking
for the same extra twice counts it once.

**Response**

```text
GET /rooms/204/quote?check_in=2026-10-01&nights=3&extra=late-checkout&extra=breakfast

{"room_number": 204, "check_in": "2026-10-01", "check_out": "2026-10-04", "nights": 3,
 "extras": ["breakfast", "late-checkout"], "total": 465}
```

`extras` is sorted alphabetically. The total there is 3 × 130 for the room, 3 × 15 for breakfast
and 30 for the late check-out.
