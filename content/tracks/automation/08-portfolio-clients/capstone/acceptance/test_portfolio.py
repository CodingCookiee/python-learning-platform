"""Acceptance tests for your portfolio, run by GitHub Actions in your repository.

They import portfolio.py from the top of your repository, check your own STUDIES, OFFER and
PROSPECTS against the brief, run `python portfolio.py --check` and `python portfolio.py --out
<folder>`, read the pages it writes, and try the checks on made-up data to make sure they still
catch each problem. No network and no API keys: everything here is standard library.
"""

import dataclasses
import importlib
import os
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

PROGRAM = Path("portfolio.py")
EMAIL = re.compile(r"[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+?\(?\d[\d ()-]{7,}\d")
SOURCES = {"referral", "community", "cold"}


# Helpers

def portfolio():
    """Your portfolio.py, imported as a module."""
    assert PROGRAM.exists(), "portfolio.py should be at the top of your repository (save starter.py as portfolio.py)"
    try:
        module = importlib.import_module("portfolio")
    except Exception as exc:  # a syntax error or a crash at import time
        pytest.fail(f"Importing portfolio.py failed: {exc!r}")
    for name in ["Metric", "CaseStudy", "Offer", "Prospect", "STUDIES", "OFFER", "PROSPECTS",
                 "anonymise", "headline", "render_case_study", "render_offer", "render_outreach", "check"]:
        assert hasattr(module, name), f"portfolio.py should still define {name}, as the starter does"
    return module


def run(*args: str, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    assert PROGRAM.exists(), "portfolio.py should be at the top of your repository (save starter.py as portfolio.py)"
    return subprocess.run(
        [sys.executable, str(PROGRAM), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )


@pytest.fixture(scope="module")
def pages(tmp_path_factory) -> dict[str, str]:
    """Run `python portfolio.py --out <folder>` once and read every page it writes."""
    out = tmp_path_factory.mktemp("out")
    result = run("--out", str(out))
    assert "Traceback" not in result.stderr, f"python portfolio.py crashed:\n{result.stderr[-1500:]}"
    found = {p.relative_to(out).as_posix(): p.read_text(encoding="utf-8") for p in out.rglob("*.md")}
    assert found, f"python portfolio.py --out {out} wrote no markdown files. It printed:\n{result.stdout[-1500:]}"
    return found


def page(pages: dict[str, str], name: str) -> str:
    assert name in pages, f"python portfolio.py --out <folder> should write <folder>/{name}; it wrote {sorted(pages)}"
    return pages[name]


def headings(text: str) -> list[str]:
    return [line[3:].strip().lower() for line in text.splitlines() if line.startswith("## ")]


def section(text: str, name: str) -> str:
    """The body of the first '## ' section whose heading starts with name (any case)."""
    body, inside = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            if inside:
                break
            inside = line[3:].strip().lower().startswith(name.lower())
            continue
        if inside:
            body.append(line)
    assert inside or body, f"No '## {name}' section in:\n{text[:1500]}"
    return "\n".join(body).strip()


def phone_numbers(text: str) -> list[str]:
    return [m.group() for m in PHONE.finditer(text) if sum(ch.isdigit() for ch in m.group()) >= 9]


def example_data(p):
    """A complete, made-up portfolio built with your dataclasses, that should pass check()."""
    study = p.CaseStudy(
        slug="triage-a",
        client="Harbour Bikes",
        placeholder="an online bike shop",
        who_for="Online shops whose support inbox takes someone's whole morning",
        problem="The inbox at Harbour Bikes was sorted by hand by Jo Marsh every morning.",
        approach=["Collected 200 test tickets", "Built a service that labels each one", "Measured it"],
        metrics=[
            p.Metric("Tickets needing a person", 200, 14, "of 200", "eval run on the 200-ticket test set, 2026-09-14"),
            p.Metric("Tickets routed to the right queue", 71, 93, "%", "same run; before is the old keyword rules"),
        ],
        period="a 200-ticket test set, not live traffic",
        stack=["Python", "FastAPI"],
        limits="It hasn't run on a live inbox yet.",
        demo_url="https://videos.example.com/demo-a",
        repo_url="https://github.com/your-name/triage-a",
        names={"Jo Marsh": "the shop's owner"},
    )
    studies = [
        study,
        dataclasses.replace(study, slug="triage-b", demo_url="https://videos.example.com/demo-b"),
        dataclasses.replace(study, slug="triage-c", demo_url="https://videos.example.com/demo-c"),
    ]
    offer = p.Offer(
        name="Support inbox triage for online shops",
        for_whom="Online shops with 50 or more support emails a day",
        problem="Support emails that someone sorts by hand.",
        result="Routine emails are labelled and drafted in seconds.",
        includes=["Triage of up to 5 queues", "Draft replies for your 10 most common questions"],
        out_of_scope=["Phone and live chat"],
        timeline_weeks=4,
        build_price=Decimal("4500"),
        retainer_per_month=Decimal("350"),
        ai_terms="AI usage billed at cost plus 20%, estimated at 40 a month and capped at 80",
        assumptions=["Read access to your helpdesk by week 1"],
        next_step="A 30-minute call.",
        currency="GBP",
    )
    prospects = [
        p.Prospect("Petal & Pine", "operations lead", "community", "asked about inbox tools in a forum",
                   "Thanks for the thread on inbox tools."),
        p.Prospect("Northfold Outdoor", "customer service manager", "cold", "hiring a second support person",
                   "I saw you're hiring."),
    ]
    return studies, offer, prospects


# Your data

def test_importing_portfolio_py_does_not_run_it():
    result = subprocess.run(
        [sys.executable, "-c", "import portfolio"], capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=30,
    )
    assert result.returncode == 0, f"Importing portfolio.py failed:\n{result.stderr[-1500:]}"
    assert "wrote" not in result.stdout and "problem" not in result.stdout, (
        'Importing portfolio.py ran the program: keep the call to main() under if __name__ == "__main__":'
    )
    portfolio()


def test_the_check_passes_on_your_data():
    result = run("--check")
    assert "Traceback" not in result.stderr, f"python portfolio.py --check crashed:\n{result.stderr[-1500:]}"
    assert result.returncode == 0, (
        f"python portfolio.py --check should exit with 0 on your own data, but it found problems:\n"
        f"{result.stdout[-1500:]}"
    )


def test_three_case_studies_from_different_projects_with_demo_and_code_links():
    studies = portfolio().STUDIES
    assert len(studies) >= 3, f"STUDIES has {len(studies)} case studies; the capstone needs three"
    slugs = [s.slug for s in studies]
    assert len(set(slugs)) == len(slugs), f"Each case study needs its own slug, got {slugs}"
    for s in studies:
        assert s.demo_url.startswith("http"), f"{s.slug}: demo_url should link the demo video, got {s.demo_url!r}"
        assert s.repo_url.startswith("http"), f"{s.slug}: repo_url should link the project's code, got {s.repo_url!r}"
    repos = [s.repo_url.rstrip("/").lower() for s in studies]
    assert len(set(repos)) == len(repos), f"Each case study should come from a different project, but repo_url repeats: {repos}"


def test_every_case_study_has_two_sourced_metrics_a_period_and_limits():
    for s in portfolio().STUDIES:
        assert len(s.metrics) >= 2, f"{s.slug}: needs at least two before-and-after metrics, has {len(s.metrics)}"
        for m in s.metrics:
            assert str(m.source).strip(), f"{s.slug}: the metric '{m.label}' needs a source (where and when it was measured)"
        assert s.metrics[0].before != 0, f"{s.slug}: the headline metric (the first one) needs a 'before' value"
        assert s.period.strip(), f"{s.slug}: say what period or test set the numbers were measured on (period)"
        assert s.limits.strip(), f"{s.slug}: the Limits section is empty; say what the system doesn't do"


def test_offer_has_a_countable_scope_a_fixed_price_and_an_ai_cap():
    offer = portfolio().OFFER
    assert offer.includes, "OFFER.includes is empty: list what's included"
    for item in offer.includes:
        assert any(ch.isdigit() for ch in item), f"Every included item should be countable (have a number): {item!r}"
    assert offer.out_of_scope, "OFFER.out_of_scope is empty: list what a buyer might assume is included but isn't"
    assert offer.build_price > 0, "OFFER.build_price should be a fixed price above 0"
    assert offer.retainer_per_month > 0, "OFFER.retainer_per_month should be the price of the optional monthly care plan"
    assert offer.timeline_weeks > 0, "OFFER.timeline_weeks should be the number of weeks from the deposit"
    assert offer.currency.strip(), 'OFFER.currency is empty: write the currency on the page (for example "GBP" or "USD")'
    assert "cap" in offer.ai_terms.lower(), f"OFFER.ai_terms should say how AI usage is capped: {offer.ai_terms!r}"
    assert offer.assumptions, "OFFER.assumptions is empty: say what must be true for the price and timeline to hold"
    assert offer.next_step.strip(), "OFFER.next_step is empty: give one small, concrete next step"


def test_outreach_list_has_ten_businesses_each_with_a_source_and_a_reason():
    prospects = portfolio().PROSPECTS
    assert len(prospects) >= 10, f"PROSPECTS has {len(prospects)} businesses; the capstone needs at least 10"
    companies = [p.company.strip().lower() for p in prospects]
    assert len(set(companies)) == len(companies), "Each prospect should be a different business"
    for p in prospects:
        assert p.company.strip() and p.role.strip(), f"Every prospect needs a company and a role to write to: {p!r}"
        assert p.source in SOURCES, f"{p.company}: source should be one of referral, community or cold, got {p.source!r}"
        assert p.why.strip(), f"{p.company}: say why you chose this business (why)"
        fields = " ".join([p.company, p.role, p.why, p.note, p.status])
        assert not EMAIL.search(fields), f"{p.company}: has an email address; keep contact details in your own CRM"
        assert not phone_numbers(fields), f"{p.company}: has a phone number; keep contact details in your own CRM"


# The pages it writes

def test_case_study_pages_lead_with_the_headline_and_the_result(pages):
    for s in portfolio().STUDIES:
        text = page(pages, f"case-studies/{s.slug}.md")
        first = next((line for line in text.splitlines() if line.strip()), "")
        assert first.startswith("# "), f"{s.slug}.md should start with the '# ' headline, got {first!r}"
        assert any(ch.isdigit() for ch in first), f"{s.slug}.md: the headline should name a measured result: {first!r}"
        assert s.placeholder.lower() in first.lower(), (
            f"{s.slug}.md: the headline should name the kind of business ({s.placeholder!r}): {first!r}"
        )
        found = headings(text)
        for name in ["result", "problem", "approach", "limits"]:
            assert any(h.startswith(name) for h in found), f"{s.slug}.md has no '## {name.title()}' section"
        order = [next(i for i, h in enumerate(found) if h.startswith(name)) for name in ["result", "problem", "approach"]]
        assert order == sorted(order), f"{s.slug}.md: the Result section should come before the Problem and the Approach"


def test_result_sections_show_each_metric_before_and_after_with_its_source(pages):
    for s in portfolio().STUDIES:
        result = section(page(pages, f"case-studies/{s.slug}.md"), "result")
        for m in s.metrics:
            assert m.label.lower() in result.lower(), f"{s.slug}.md: the Result section doesn't mention '{m.label}'"
            for value in (m.before, m.after):
                assert str(value) in result, f"{s.slug}.md: '{m.label}' should show its before and after ({m.before} and {m.after})"
            assert m.source.lower() in result.lower(), f"{s.slug}.md: the Result section should give the source of '{m.label}'"


def test_published_pages_name_no_one_and_hold_no_contact_details(pages):
    for s in portfolio().STUDIES:
        text = page(pages, f"case-studies/{s.slug}.md")
        for real in [s.client, *s.names]:
            assert real.lower() not in text.lower(), f"{s.slug}.md: the real name {real!r} appears in the published page"
    for name, text in pages.items():
        assert not EMAIL.search(text), f"{name} contains an email address: {EMAIL.search(text).group()!r}"
        assert not phone_numbers(text), f"{name} contains a phone number: {phone_numbers(text)[0]!r}"


def test_offer_page_shows_the_scope_the_price_and_the_next_step(pages):
    offer = portfolio().OFFER
    text = page(pages, "offer.md")
    for item in [*offer.includes, *offer.out_of_scope, *offer.assumptions]:
        assert item in text, f"offer.md is missing {item!r}"
    assert offer.currency in text, f"offer.md should show the currency ({offer.currency!r})"
    price = f"{offer.build_price:,.0f}"
    assert price in text or str(offer.build_price) in text, f"offer.md should show the build price ({price})"
    assert offer.ai_terms in text, "offer.md should show how AI usage is billed and capped"
    assert offer.next_step in text, "offer.md should end with the next step"


def test_outreach_page_has_a_short_first_message_a_follow_up_and_the_list(pages):
    text = page(pages, "outreach.md")
    first = section(text, "first message")
    words = [w for line in first.splitlines() if not line.startswith("```") for w in line.split()]
    assert words, "outreach.md: the First message section is empty"
    assert len(words) <= 120, f"outreach.md: the first message is {len(words)} words; keep it under 120"
    assert section(text, "follow-up"), "outreach.md: the Follow-up section is empty"
    prospects = section(text, "prospects")
    for p in portfolio().PROSPECTS:
        assert p.company in prospects, f"outreach.md: {p.company} is missing from the Prospects list"


# The code, on made-up data

def test_anonymise_replaces_names_emails_and_phone_numbers():
    p = portfolio()
    text = ("HARBOUR BIKES asked Jo Marsh to call +44 7700 900123 or email jo@harbour-bikes.co.uk, "
            "see https://example.com/?email=jo%40harbour-bikes.co.uk")
    out = p.anonymise(text, {"Harbour Bikes": "an online bike shop", "Jo Marsh": "the owner"})
    assert "harbour bikes" not in out.lower() and "jo marsh" not in out.lower(), f"Names survived anonymise(): {out!r}"
    assert "an online bike shop" in out and "the owner" in out, f"Names should be replaced by their placeholders: {out!r}"
    assert not EMAIL.search(out), f"An email address (or one inside a link) survived anonymise(): {out!r}"
    assert "7700" not in out, f"A phone number survived anonymise(): {out!r}"


def test_headline_names_the_change_and_the_business():
    p = portfolio()
    studies, _, _ = example_data(p)
    line = p.headline(studies[0])
    assert line.startswith("# "), f"headline() should return a '# ' markdown heading, got {line!r}"
    assert "93%" in line, f"200 -> 14 tickets is a 93% drop; the headline should say so: {line!r}"
    assert "an online bike shop" in line, f"The headline should name the kind of business: {line!r}"


def test_check_accepts_a_complete_portfolio():
    p = portfolio()
    problems = p.check(*example_data(p))
    assert problems == [], f"check() should find no problems in a complete portfolio, but found: {problems}"


def test_check_flags_each_kind_of_problem():
    p = portfolio()
    studies, offer, prospects = example_data(p)
    first = studies[0]
    m0, m1 = first.metrics

    def with_study(**changes):
        return [dataclasses.replace(first, **changes), *studies[1:]], offer, prospects

    cases = {
        "only two case studies": (studies[:2], offer, prospects),
        "a metric without a source": with_study(metrics=[m0, dataclasses.replace(m1, source=" ")]),
        "a headline metric with no before": with_study(metrics=[dataclasses.replace(m0, before=0), m1]),
        "a case study with no demo link": with_study(demo_url=""),
        "an email inside a link in the limits": with_study(limits="See https://example.com/?email=someone@example.com"),
        "the client's real name in a metric source": with_study(
            metrics=[m0, dataclasses.replace(m1, source="Harbour Bikes' own spreadsheet")]),
        "a vague offer item": (studies, dataclasses.replace(offer, includes=["Improve your support workflow by 2 steps"]), prospects),
        "an offer item that can't be counted": (studies, dataclasses.replace(offer, includes=["Draft replies"]), prospects),
        "no out-of-scope list": (studies, dataclasses.replace(offer, out_of_scope=[]), prospects),
        "no build price": (studies, dataclasses.replace(offer, build_price=Decimal("0")), prospects),
        "AI terms without a cap": (studies, dataclasses.replace(offer, ai_terms="AI usage billed at cost"), prospects),
        "a first message over 120 words": (
            studies, dataclasses.replace(offer, for_whom="Shops " + "with many support emails " * 30), prospects),
        "a prospect with an email address": (
            studies, offer, [*prospects, p.Prospect("Kettle & Crumb", "owner", "referral", "a friend's shop", "Mail anna@kettle.example.com")]),
        "a cold prospect with no personal note": (
            studies, offer, [*prospects, p.Prospect("Ridgeway Running", "owner", "cold", "slow replies in reviews", "")]),
    }
    missed = [name for name, args in cases.items() if not p.check(*args)]
    assert not missed, "check() returned no problems for: " + "; ".join(missed)
