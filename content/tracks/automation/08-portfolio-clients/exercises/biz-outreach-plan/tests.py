from datetime import date

from plp import hidden, test
from solution import plan_outreach

TODAY = date(2026, 10, 12)


def prospect(email, source, note="", **fields):
    return {"email": email, "source": source, "note": note, **fields}


PROSPECTS = [
    prospect("hello@petalandpine.example", "cold", "Loved the new spring range: are order emails eating your mornings?"),
    prospect("ops@okaforlogistics.example", "community", "Good to meet you at the logistics meetup.",
             touches=1, last_contacted=date(2026, 10, 1)),
    prospect("owner@harbourroaddental.example", "referral", "Sara at Brightsmile suggested I get in touch."),
    prospect("info@lumenlamps.example", "cold", ""),
    prospect("team@northfold.example", "community", "Thanks for the answer in the forum.",
             touches=1, last_contacted=date(2026, 10, 8)),
    prospect("sales@competitor.example", "cold", "Hi there."),
    prospect("nia@kensalsmiles.example", "referral", "Tom suggested we talk.", replied=True),
]


@test("Plans three messages for today")
def _():
    assert plan_outreach(PROSPECTS, today=TODAY, daily_limit=3, suppressed={"@competitor.example"}) == [
        ("owner@harbourroaddental.example", 1),
        ("ops@okaforlogistics.example", 2),
        ("hello@petalandpine.example", 1),
    ]


@test("Nobody hears from you twice in a week, and cold messages must be personal")
def _():
    planned = [email for email, _ in plan_outreach(PROSPECTS, today=TODAY, daily_limit=10)]
    assert "team@northfold.example" not in planned
    assert "info@lumenlamps.example" not in planned
    assert "nia@kensalsmiles.example" not in planned


@test("Suppressed addresses and domains are never contacted, whatever the case")
def _():
    planned = plan_outreach(PROSPECTS, today=TODAY, daily_limit=10,
                            suppressed={"HELLO@PetalAndPine.example", "@Competitor.Example"})
    assert [email for email, _ in planned] == ["owner@harbourroaddental.example", "ops@okaforlogistics.example"]


@test("Three messages is the most anyone gets")
def _():
    done = [prospect("ops@okaforlogistics.example", "community", "Hi again.", touches=3,
                     last_contacted=date(2026, 9, 1))]
    assert plan_outreach(done, today=TODAY, daily_limit=5) == []


@hidden("Within a source, the longest-waiting come first, then by address")
def _():
    people = [
        prospect("b@shop.example", "cold", "Note", touches=1, last_contacted=date(2026, 9, 20)),
        prospect("a@shop.example", "cold", "Note", touches=2, last_contacted=date(2026, 9, 28)),
        prospect("c@shop.example", "cold", "Note"),
        prospect("d@shop.example", "cold", "Note", touches=1, last_contacted=date(2026, 9, 20)),
    ]
    assert plan_outreach(people, today=TODAY, daily_limit=10) == [
        ("c@shop.example", 1), ("b@shop.example", 2), ("d@shop.example", 2), ("a@shop.example", 3)]


@hidden("Exactly 7 days since the last message is long enough; opted-out is never")
def _():
    people = [
        prospect("ops@okaforlogistics.example", "community", "", touches=1, last_contacted=date(2026, 10, 5)),
        prospect("hello@petalandpine.example", "referral", "Hi", opted_out=True),
    ]
    assert plan_outreach(people, today=TODAY, daily_limit=5) == [("ops@okaforlogistics.example", 2)]
