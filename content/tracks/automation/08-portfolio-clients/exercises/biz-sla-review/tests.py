from decimal import Decimal

from plp import hidden, test
from solution import review_sla

PROVIDER = Decimal("99.5")
GOOD = {"uptime": Decimal("99.5"), "response_hours": 4,
        "accuracy": {"target": Decimal("92"), "measured_on": "the agreed 200-ticket test set, monthly"}}


@test("Finds four problems in the agency's draft SLA")
def _():
    assert review_sla({"uptime": Decimal("99.9"), "response_hours": 4,
                       "accuracy": {"target": Decimal("100")}, "fix_hours": 24},
                      provider_uptime=PROVIDER) == [
        "uptime of 99.9% is more than the AI provider's 99.5%: exclude provider outages or lower it",
        "no AI system is 100% accurate: promise a score on a test set",
        "say what accuracy is measured on",
        "promise a response and a workaround, not a fix time",
    ]


@test("A realistic SLA passes")
def _():
    assert review_sla(GOOD, provider_uptime=PROVIDER) == []


@test("Excluding provider outages makes a higher uptime promise fair")
def _():
    sla = {**GOOD, "uptime": Decimal("99.9"), "excludes_provider_outages": True}
    assert review_sla(sla, provider_uptime=PROVIDER) == []


@test("An SLA must say how fast you respond")
def _():
    assert review_sla({"uptime": Decimal("99")}, provider_uptime=PROVIDER) == ["say how quickly you'll respond"]


@hidden("No accuracy promise at all is fine")
def _():
    assert review_sla({"response_hours": 8}, provider_uptime=PROVIDER) == []


@hidden("A blank measured_on counts as missing, and 99.99 isn't 100")
def _():
    sla = {**GOOD, "accuracy": {"target": Decimal("99.99"), "measured_on": "  "}}
    assert review_sla(sla, provider_uptime=PROVIDER) == ["say what accuracy is measured on"]
