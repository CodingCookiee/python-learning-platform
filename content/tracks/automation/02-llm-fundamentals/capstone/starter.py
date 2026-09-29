"""Compare models on one task, and report quality, latency and cost.

    python compare.py --offline                      # simulated models: no keys, no network
    python compare.py --prices prices.json           # real providers, with the keys in your environment

Real runs use your llm.py from this module (next to this file) and every provider whose key is set:
ANTHROPIC_API_KEY with ANTHROPIC_MODELS, and OPENAI_API_KEY with OPENAI_MODELS (comma-separated).
"""

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

LABELS = ("billing", "delivery", "damaged", "account", "other")

SYSTEM = """You sort customer support tickets for Harbour Bikes into one category.

billing: charges, refunds, invoices, payment methods
delivery: late, lost or tracking questions about an order
damaged: something arrived broken, scratched or with parts missing
account: logging in, passwords, email addresses, deleting an account
other: anything else

Reply with exactly one word: billing, delivery, damaged, account or other."""

# EXAMPLE prices in USD per million tokens for the offline models, invented for practice.
# For real runs, pass --prices with a file of current prices from each provider's pricing page.
EXAMPLE_PRICES = {
    "offline-small": {"input": Decimal("0.50"), "output": Decimal("2.00")},
    "offline-medium": {"input": Decimal("2.50"), "output": Decimal("10.00")},
    "offline-large": {"input": Decimal("12.00"), "output": Decimal("48.00")},
}


@dataclass(frozen=True)
class EvalCase:
    ticket: str
    expected: str


CASES = [
    EvalCase("I was charged twice for order #1042. Please refund one of the payments.", "billing"),
    EvalCase("My order #2210 was due on Monday and it still hasn't arrived.", "delivery"),
    EvalCase("The frame of my new bike arrived with a deep scratch along the top tube.", "damaged"),
    EvalCase("I can't log in: the reset password email never comes through.", "account"),
    EvalCase("Do you sponsor local cycling clubs? We race every Sunday.", "other"),
    EvalCase("Can I get a VAT invoice for the cargo bike I bought last month?", "billing"),
    EvalCase("Tracking for #3307 hasn't updated in five days. Is it lost?", "delivery"),
    EvalCase("The box came without the pedals, and one brake lever is snapped.", "damaged"),
    EvalCase("Please change the email address on my account to ada@example.com.", "account"),
    EvalCase("Which of your bikes would suit a 12 km commute with hills?", "other"),
    EvalCase("You charged my card but the order page says payment failed.", "billing"),
    EvalCase("Can you delete my account and all the data you hold about me?", "account"),
]


# The comparison


@dataclass(frozen=True)
class Target:
    """One model to test: a label for the report, a client, and the model name to ask it for."""

    label: str
    llm: object  # anything with the course's complete() method
    model: str


@dataclass
class ModelResult:
    label: str
    model: str
    scores: list = field(default_factory=list)  # one per case; a failed call scores 0
    latencies_ms: list = field(default_factory=list)  # successful calls only
    input_tokens: int = 0
    output_tokens: int = 0
    errors: int = 0
    cost: Decimal | None = None  # None when there's no price for the model

    @property
    def quality(self):
        """The mean score over every case (failed calls count as 0)."""
        ...

    @property
    def median_ms(self):
        """The median latency of the successful calls, or None if there were none."""
        ...

    @property
    def p90_ms(self):
        """The 90th-percentile latency of the successful calls, or None."""
        ...

    def cost_per_1000(self):
        """The cost of 1,000 tasks at this run's average, or None without a price."""
        ...


def percentile(values, pct):
    """The nearest-rank percentile: the smallest value with pct% of the values at or below it."""
    ...


def build_messages(case):
    """The request for one case: the ticket, delimited, as the only message."""
    ...


def score(reply_text, case):
    """1.0 when the reply is the expected label (ignoring case, spaces and a full stop), else 0.0."""
    ...


def evaluate(target, cases, *, clock):
    """Run every case on one target, timing each call. A failed call counts as an error and scores 0."""
    ...


def price(result, prices):
    """The run's total cost, or None if the model has no price."""
    ...


def run_comparison(targets, cases, *, prices, clock=time.perf_counter):
    """Evaluate every target on every case, price each run, and return the ModelResults in order."""
    ...


def recommend(results, *, min_quality, max_latency_ms):
    """The cheapest result that meets both bars (higher quality breaks a tie), or None."""
    ...


def money(amount, places=4):
    return "n/a" if amount is None else f"${amount:,.{places}f}"


def millis(value):
    return "-" if value is None else f"{value:,.0f}"


def format_report(results, *, cases, min_quality, max_latency_ms):
    """The report shown in the brief, as one string."""
    ...


# Offline mode: pretend models, so the harness runs with no keys


class FakeClock:
    """A clock that only moves when an offline model 'takes time' to answer."""

    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


@dataclass
class _Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class _Reply:
    text: str
    usage: _Usage
    model: str
    tool_calls: list = field(default_factory=list)
    stop_reason: str = "end_turn"


class OfflineLLM:
    """A pretend model that gets a fixed share of the cases right, at a steady speed."""

    def __init__(self, clock, *, correct, latency_ms, fails=()):
        self._clock = clock
        self._correct = correct  # how many of the 12 cases it gets right
        self._latency_ms = latency_ms
        self._fails = set(fails)  # case numbers where the "provider" is overloaded

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        ticket = messages[-1]["content"]
        index = next(i for i, case in enumerate(CASES) if case.ticket in ticket)
        self._clock.now += (self._latency_ms + (index % 3) * 25) / 1000
        if index in self._fails:
            raise RuntimeError("Fake LLM error 529: Overloaded")
        expected = CASES[index].expected
        right = (index * 7) % len(CASES) < self._correct
        label = expected if right else next(label for label in LABELS if label != expected)
        text = label.capitalize() + "." if index % 4 == 0 else label
        usage = _Usage(math.ceil(len((system or "") + ticket) / 4), 2)
        return _Reply(text, usage, model)


def offline_targets(clock):
    return [
        Target("offline/offline-small", OfflineLLM(clock, correct=9, latency_ms=400), "offline-small"),
        Target("offline/offline-medium", OfflineLLM(clock, correct=11, latency_ms=880), "offline-medium"),
        Target("offline/offline-large", OfflineLLM(clock, correct=12, latency_ms=2050, fails=[7]), "offline-large"),
    ]


# Real mode: your llm.py, with the keys in the environment


def real_targets(env):
    """A Target for each model to compare on each provider whose key is set, using your llm.py:
    ANTHROPIC_API_KEY with ANTHROPIC_MODELS (default claude-haiku-4-5,claude-sonnet-5), and
    OPENAI_API_KEY with OPENAI_MODELS (required: there's no default). SystemExit if there are none."""
    import httpx
    from llm import AnthropicClient, OpenAIClient

    ...


def load_prices(path):
    raw = json.loads(Path(path).read_text(encoding="utf8"))
    return {
        model: {"input": Decimal(str(p["input"])), "output": Decimal(str(p["output"]))}
        for model, p in raw.items()
        if not model.startswith("_")
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Compare models on the ticket-category task.")
    parser.add_argument("--offline", action="store_true", help="use simulated models (no keys needed)")
    parser.add_argument("--prices", help="a JSON file of prices per million tokens")
    parser.add_argument("--min-quality", type=float, default=0.9)
    parser.add_argument("--max-latency-ms", type=int, default=1500)
    args = parser.parse_args(argv)

    if args.offline:
        clock = FakeClock()
        targets, prices = offline_targets(clock), EXAMPLE_PRICES
    else:
        clock = time.perf_counter
        targets, prices = real_targets(os.environ), load_prices(args.prices) if args.prices else {}

    results = run_comparison(targets, CASES, prices=prices, clock=clock)
    print(format_report(results, cases=CASES, min_quality=args.min_quality, max_latency_ms=args.max_latency_ms))
    return 0


if __name__ == "__main__":
    sys.exit(main())
