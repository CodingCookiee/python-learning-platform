import pandas as pd
from plp import hidden, raises, test
from solution import cost_report, top_users

PRICES = {  # EXAMPLE prices, dollars per million tokens
    "model-small": {"input": 0.50, "output": 2.00},
    "model-large": {"input": 12.00, "output": 48.00},
}


def call(ts, user, feature, model, input_tokens, output_tokens):
    return {"ts": ts, "user": user, "feature": feature, "model": model, "input_tokens": input_tokens, "output_tokens": output_tokens}


EXAMPLE = [
    call("2026-10-05T09:12:00Z", "u_3f9a", "support_bot", "model-small", 1800, 120),
    call("2026-10-05T09:13:10Z", "u_3f9a", "support_bot", "model-large", 2400, 300),
]
WEEK = [
    call("2026-10-05T08:00:00Z", "u_1", "invoice_extractor", "model-small", 900_000, 40_000),  # $0.53
    call("2026-10-05T10:00:00Z", "u_2", "support_bot", "model-small", 100_000, 10_000),  # $0.07
    call("2026-10-05T23:30:00+01:00", "u_2", "support_bot", "model-large", 50_000, 5_000),  # $0.84, 22:30 UTC
    call("2026-10-06T00:30:00+01:00", "u_3", "support_bot", "model-small", 20_000, 2_000),  # $0.014, 23:30 UTC on the 5th
    call("2026-10-06T09:00:00Z", "u_1", "invoice_extractor", "model-small", 800_000, 30_000),  # $0.46
    call("2026-10-06T12:00:00-05:00", "u_3", "email_triage", "model-small", 10_000, 1_000),  # $0.007
]


def rows(report):
    return [tuple(row) for row in report[["day", "feature", "calls", "cost"]].itertuples(index=False)]


@test("Reports the example as one row", timeout=10)
def _():
    assert cost_report(EXAMPLE, PRICES).to_dict("records") == [
        {"day": "2026-10-05", "feature": "support_bot", "calls": 2, "input_tokens": 4200, "output_tokens": 420, "cost": 0.0443}
    ]


@test("Groups by UTC day and feature, most expensive first within a day", timeout=10)
def _():
    report = cost_report(WEEK, PRICES)
    assert isinstance(report, pd.DataFrame)
    assert list(report.columns) == ["day", "feature", "calls", "input_tokens", "output_tokens", "cost"]
    assert rows(report) == [
        ("2026-10-05", "support_bot", 3, 0.924),
        ("2026-10-05", "invoice_extractor", 1, 0.53),
        ("2026-10-06", "invoice_extractor", 1, 0.46),
        ("2026-10-06", "email_triage", 1, 0.007),
    ]
    assert list(report.index) == [0, 1, 2, 3]


@test("A model with no price raises ValueError naming every one", timeout=10)
def _():
    usage = EXAMPLE + [
        call("2026-10-05T11:00:00Z", "u_9", "support_bot", "model-new", 100, 10),
        call("2026-10-05T11:01:00Z", "u_9", "support_bot", "model-beta", 100, 10),
    ]
    with raises(ValueError, what="cost_report(usage, PRICES)") as caught:
        cost_report(usage, PRICES)
    assert "model-new" in str(caught.value) and "model-beta" in str(caught.value)


@test("top_users ranks users by their total cost", timeout=10)
def _():
    assert top_users(WEEK, PRICES, n=2) == [("u_1", 0.99), ("u_2", 0.91)]


@hidden("Token sums are per group, and top_users defaults to three", timeout=10)
def _():
    report = cost_report(WEEK, PRICES)
    support = report[(report.day == "2026-10-05") & (report.feature == "support_bot")].iloc[0]
    assert (int(support.input_tokens), int(support.output_tokens)) == (170_000, 17_000)
    assert top_users(WEEK, PRICES) == [("u_1", 0.99), ("u_2", 0.91), ("u_3", 0.021)]
