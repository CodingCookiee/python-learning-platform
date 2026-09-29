"""Render your case studies, your offer and your outreach message from structured data.

    python portfolio.py            # writes everything to out/ and prints the checks
    python portfolio.py --check    # only the checks

Replace the EXAMPLE data at the bottom of this file with your own projects, offer and prospects.
The real names you list in `names` are used only to find and replace them: they're never written
to out/. Standard library only, so it runs anywhere Python 3.12+ does.
"""

import argparse
import re
import sys
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

EMAIL = re.compile(r"[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+?\(?\d[\d ()-]{7,}\d")
VAGUE = re.compile(r"\b(?:improv|optimi|enhanc|streamlin|better|seamless|transform|revolution)\w*", re.IGNORECASE)
MAX_OUTREACH_WORDS = 120


@dataclass
class Metric:
    label: str
    before: Decimal | int
    after: Decimal | int
    unit: str
    source: str                      # where the number came from, and when it was measured


@dataclass
class CaseStudy:
    slug: str
    client: str                      # the real name: used to find it, never published
    placeholder: str                 # how the client is described instead, e.g. "an online shop"
    who_for: str                     # one line: the kind of business this is for
    problem: str
    approach: list[str]
    metrics: list[Metric]
    period: str                      # e.g. "a 200-ticket test set" or "the first three months"
    stack: list[str]
    limits: str                      # what it doesn't do, honestly
    demo_url: str = ""
    repo_url: str = ""
    quote: str = ""
    names: dict[str, str] = field(default_factory=dict)   # other real names -> placeholders


@dataclass
class Offer:
    name: str
    for_whom: str
    problem: str
    result: str
    includes: list[str]
    out_of_scope: list[str]
    timeline_weeks: int
    build_price: Decimal
    retainer_per_month: Decimal
    ai_terms: str
    assumptions: list[str]
    next_step: str
    currency: str = ""               # e.g. "GBP", "USD", "PKR", "AED"


@dataclass
class Prospect:
    company: str                     # a business, never a private person
    role: str                        # who you'd write to, by role, e.g. "practice manager"
    source: str                      # "referral", "community" or "cold"
    why: str                         # why them, specifically
    note: str                        # the personal first line you'll use
    status: str = "not contacted"


# Text helpers (the lesson 6 drills)

def anonymise(text: str, names: dict[str, str]) -> str:
    """Replace emails, phone numbers and the given real names with placeholders."""
    text = EMAIL.sub("[email]", text)
    text = PHONE.sub(lambda m: "[phone]" if sum(ch.isdigit() for ch in m.group()) >= 9 else m.group(), text)
    if names:
        lookup = {name.lower(): placeholder for name, placeholder in names.items()}
        alternatives = "|".join(re.escape(name) for name in sorted(names, key=len, reverse=True))
        pattern = re.compile(rf"(?<!\w)(?:{alternatives})(?!\w)", re.IGNORECASE)
        text = pattern.sub(lambda m: lookup[m.group().lower()], text)
    return text


def change(before: Decimal | int, after: Decimal | int, unit: str) -> str:
    """"+22 points" for percentages, "-93%" for everything else."""
    if unit == "%":
        return f"{Decimal(after - before):+} points"
    percent = (Decimal(after - before) / Decimal(before) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return f"{int(percent):+}%"


def before_after(metric: Metric) -> str:
    line = f"{metric.label}: {metric.before} → {metric.after} {metric.unit}".replace(" %", "%")
    return line if metric.before == 0 else f"{line} ({change(metric.before, metric.after, metric.unit)})"


def money(amount: Decimal, currency: str) -> str:
    return f"{currency} {amount:,.0f}".strip()


# Rendering

def headline(study: CaseStudy) -> str:
    first = study.metrics[0]
    moved = change(first.before, first.after, first.unit).lstrip("+-")
    direction = "down" if first.after < first.before else "up"
    return f"# {first.label} {direction} {moved} for {study.placeholder}"


def render_case_study(study: CaseStudy) -> str:
    names = {study.client: study.placeholder, **study.names}
    links = " · ".join(f"[{label}]({url})" for label, url in [("Demo", study.demo_url), ("Code", study.repo_url)] if url)
    sections = [
        [headline(study), "", f"**For:** {study.who_for}"] + ([links] if links else []),
        ["## Result", f"Measured on {study.period}:"]
        + [f"- {before_after(m)}" for m in study.metrics]
        + ["", "Sources: " + "; ".join(f"{m.label.lower()}: {m.source}" for m in study.metrics)],
        ["## Problem", anonymise(study.problem, names)],
        ["## Approach"] + [f"{n}. {anonymise(step, names)}" for n, step in enumerate(study.approach, 1)],
        ["## Built with", " · ".join(study.stack)],
        ["## Limits", anonymise(study.limits, names)],
    ]
    if study.quote:
        sections.append([f'> "{anonymise(study.quote, names)}"'])
    return "\n\n".join("\n".join(lines) for lines in sections) + "\n"


def render_offer(offer: Offer) -> str:
    sections = [
        [f"# {offer.name}", "", f"**For:** {offer.for_whom}"],
        ["## The problem", offer.problem],
        ["## What changes", offer.result],
        ["## What's included"] + [f"- {item}" for item in offer.includes],
        ["## Not included"] + [f"- {item}" for item in offer.out_of_scope],
        ["## Timeline and price",
         f"- Live in {offer.timeline_weeks} weeks from the deposit",
         f"- Build: {money(offer.build_price, offer.currency)}, fixed",
         f"- Care plan: {money(offer.retainer_per_month, offer.currency)} a month, optional",
         f"- {offer.ai_terms}"],
        ["## Assumptions"] + [f"- {item}" for item in offer.assumptions],
        ["## Next step", offer.next_step],
    ]
    return "\n\n".join("\n".join(lines) for lines in sections) + "\n"


def went_from(metric: Metric) -> str:
    return f"{metric.label.lower()} went from {metric.before} to {metric.after} {metric.unit}".replace(" %", "%")


def render_outreach(offer: Offer, studies: list[CaseStudy], prospects: list[Prospect]) -> str:
    best = studies[0]
    message = "\n\n".join([
        f"Subject: {offer.name}",
        "Hi <first name>,",
        "<your personal note>",
        f"I build automations for {offer.for_whom[0].lower() + offer.for_whom[1:]}. "
        f"For {best.placeholder}, {went_from(best.metrics[0])}. "
        "There's a two-minute write-up here: <case study link>.",
        "Would a 20-minute call next week be useful? If not, just say so and I won't follow up.",
        "<your name>",
    ])
    follow_up = "\n\n".join([
        f"Subject: Re: {offer.name}",
        "Hi <first name>, one last note in case my email got buried. If this isn't a priority right "
        "now, no problem at all, and I won't write again.",
        "<your name>",
    ])
    rows = ["| Company | Role | Source | Why them | Status |", "|---|---|---|---|---|"]
    rows += [f"| {p.company} | {p.role} | {p.source} | {p.why} | {p.status} |" for p in prospects]
    sections = [
        ["# Outreach"],
        ["## First message", "```text", message, "```"],
        ["## Follow-up (at most one more after this, a week or more later)", "```text", follow_up, "```"],
        ["## Prospects", "Contact details live in my own CRM, not in this repository."] + rows,
    ]
    return "\n\n".join("\n".join(lines) for lines in sections) + "\n"


# Checks

def check(studies: list[CaseStudy], offer: Offer, prospects: list[Prospect]) -> list[str]:
    problems = []
    if len(studies) < 3:
        problems.append(f"{len(studies)} case study; the capstone needs 3" if len(studies) == 1
                        else f"{len(studies)} case studies; the capstone needs 3")
    for study in studies:
        if not study.metrics:
            problems.append(f"{study.slug}: no numbers")
            continue
        if study.metrics[0].before == 0:
            problems.append(f"{study.slug}: the headline metric needs a before value")
        problems += [f"{study.slug}: '{m.label}' has no source" for m in study.metrics if not m.source.strip()]
        text = render_case_study(study)
        for real in [study.client, *study.names]:
            if real.lower() in text.lower():
                problems.append(f"{study.slug}: '{real}' appears in the published text")
        if EMAIL.search(text) or "[email]" in text or "[phone]" in text:
            problems.append(f"{study.slug}: contact details were found; take them out of the source text")
        if not study.demo_url:
            problems.append(f"{study.slug}: no demo link yet")
    for item in offer.includes:
        if VAGUE.search(item) or not any(ch.isdigit() for ch in item):
            problems.append(f"offer: make '{item}' specific and countable")
    if not offer.out_of_scope:
        problems.append("offer: list what isn't included")
    if offer.build_price <= 0:
        problems.append("offer: the build needs a price")
    if "cap" not in offer.ai_terms.lower():
        problems.append("offer: say how AI usage is capped")
    outreach = render_outreach(offer, studies, prospects) if studies else ""
    first_message = outreach.split("```text\n", 1)[-1].split("```", 1)[0]
    if len(first_message.split()) > MAX_OUTREACH_WORDS:
        problems.append(f"outreach: the first message is over {MAX_OUTREACH_WORDS} words")
    for p in prospects:
        if EMAIL.search(" ".join([p.company, p.role, p.why, p.note])):
            problems.append(f"outreach: {p.company} has an email address in the list; keep it in your CRM")
        if p.source == "cold" and not p.note.strip():
            problems.append(f"outreach: {p.company} is cold and has no personal note")
    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="only run the checks")
    parser.add_argument("--out", default="out", help="where to write the markdown (default: out)")
    args = parser.parse_args(argv)

    if not args.check:
        out = Path(args.out)
        (out / "case-studies").mkdir(parents=True, exist_ok=True)
        for study in STUDIES:
            path = out / "case-studies" / f"{study.slug}.md"
            path.write_text(render_case_study(study), encoding="utf-8")
            print(f"wrote {path.as_posix()}")
        for name, text in [("offer.md", render_offer(OFFER)), ("outreach.md", render_outreach(OFFER, STUDIES, PROSPECTS))]:
            (out / name).write_text(text, encoding="utf-8")
            print(f"wrote {(out / name).as_posix()}")

    problems = check(STUDIES, OFFER, PROSPECTS)
    print()
    for problem in problems:
        print(f"  - {problem}")
    print(f"{len(problems)} problem(s)" if problems else "all checks pass")
    return 1 if problems else 0


# EXAMPLE data: replace all of it with your own. The numbers below come from the A3 capstone's
# test set as an illustration; yours must come from your own measured runs.

STUDIES = [
    CaseStudy(
        slug="support-triage",
        client="Harbour Bikes",
        placeholder="an online bike shop",
        who_for="Online shops whose support inbox takes someone's whole morning",
        problem=("Harbour Bikes' support inbox mixed refunds, delivery questions and damaged parcels, "
                 "and one person sorted every email by hand before anyone could answer it."),
        approach=[
            "Collected 200 real-looking tickets and the queue each one belongs in, to test against",
            "Built a service that labels each ticket, pulls out the order number, and looks the order up",
            "Drafted a reply for the routine tickets, and sent anything unclear to a person's queue",
            "Measured it on the test set against the keyword rules it would replace",
        ],
        metrics=[
            Metric("Tickets needing a person", 200, 14, "of 200", "eval run on the 200-ticket test set, 2026-09-14"),
            Metric("Tickets routed to the right queue", 71, 93, "%", "same run; before is the old keyword rules"),
        ],
        period="a 200-ticket test set, not live traffic",
        stack=["Python", "FastAPI", "Pydantic", "a provider-neutral LLM client"],
        limits=("It hasn't run on a live inbox yet. Refunds over a set amount always go to a person, "
                "and the drafts are sent only after someone approves them."),
        repo_url="https://github.com/your-name/support-triage",
    ),
]

OFFER = Offer(
    name="Support inbox triage for online shops",
    for_whom="Online shops with 50 or more support emails a day",
    problem="Support emails that someone sorts by hand before anyone can answer them.",
    result="Routine emails are labelled, matched to their order and drafted in seconds; only the unclear ones reach a person.",
    includes=[
        "Triage of up to 5 queues, tested on 200 of your own past tickets",
        "Draft replies for your 10 most common questions",
        "Order lookups in 1 shop platform",
        "A 1-hour training session, recorded",
    ],
    out_of_scope=["Sending replies without a person approving them", "Phone and live chat", "Changes to your shop platform"],
    timeline_weeks=4,
    build_price=Decimal("4500"),
    retainer_per_month=Decimal("350"),
    ai_terms="AI usage billed at cost plus a 20% margin, estimated at 40 a month and capped at 80 without your approval",
    assumptions=["Read access to your helpdesk and shop platform by week 1", "200 past tickets we can label together"],
    next_step="A 30-minute call to look at last week's inbox together.",
    currency="",
)

PROSPECTS = [
    Prospect("Petal & Pine", "operations lead", "community", "asked about inbox tools in a shop owners' forum",
             "Thanks for the thread on inbox tools last week."),
    Prospect("Northfold Outdoor", "customer service manager", "cold", "hiring a second support person",
             ""),
]

if __name__ == "__main__":
    sys.exit(main())
