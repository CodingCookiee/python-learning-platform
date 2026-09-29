You keep a short list of people you'd like to work with, and each morning you choose who to write
to. You're selling automation, but the outreach itself should never feel automated. Write
`plan_outreach(prospects, *, today, daily_limit, suppressed=())`, which returns today's list as
`(email, touch)` pairs, where `touch` is which message this is (1 for the first, 2 and 3 for the
follow-ups).

Each prospect is a dict:

| Key | Meaning |
|-----|---------|
| `email` | their address |
| `source` | `"referral"`, `"community"` or `"cold"` |
| `note` | the personal first line you've written for them (may be blank) |
| `touches` | messages already sent (default 0) |
| `last_contacted` | the `date` of the last one, or `None` (the default) |
| `replied`, `opted_out` | `True` if they've answered, or asked not to be contacted (default `False`) |

Leave a prospect out if:

1. they've replied or opted out;
2. their address, or `"@"` + their domain, is in `suppressed` (compare ignoring case);
3. they've already had 3 messages: one email and two follow-ups is the most you send;
4. you wrote to them less than 7 days before `today`;
5. they're `"cold"` and their `note` is blank: no one gets a message you didn't write for them.

Order the rest by source (referrals, then community, then cold), then the longest-waiting first
(never contacted before comes first of all), then by email address. Return at most `daily_limit`
of them.

```python
plan_outreach(PROSPECTS, today=date(2026, 10, 12), daily_limit=3, suppressed={"@competitor.example"})
# [("owner@harbourroaddental.example", 1),
#  ("ops@okaforlogistics.example", 2),
#  ("hello@petalandpine.example", 1)]
```

`PROSPECTS` is at the top of the tests.
