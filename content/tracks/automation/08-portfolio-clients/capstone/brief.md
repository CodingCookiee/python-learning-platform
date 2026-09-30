This is the last capstone on the platform, and the only one with no client in the brief. The client
is you. Over the A1 to A7 capstones you've built a lead pipeline, a support triage service, a docs
chatbot, a research agent, an MCP server and a hardened production deployment. Right now they're
repositories that only a developer would understand. This capstone turns them into something a
practice manager, a shop owner or an agency director can read in two minutes and act on: **three
published case studies, one productised offer, and an outreach list with the message you'll send**.

When you've finished, you should be able to send a link to someone who runs a business, today, and
not be embarrassed by anything behind it.

It uses the whole module: opportunities and niches (lesson 1) to choose who you're for, ROI and
pricing (lesson 3) to price the offer, scoping (lesson 4) to write its scope, delivery and
retainers (lesson 5) for its care plan and SLA, and case studies, anonymising and outreach
(lesson 6) for everything else.

> [!WARNING]
> Every figure in this brief and in `starter.py` is an **example**. Your case studies must use
> numbers you measured yourself, and your prices must come from your own floor rate and market.

## Choose your client first

Before writing anything, decide who the portfolio is for. Pick one kind of business and one kind of
problem, from lesson 1: your discovery notes, an industry you've worked in, or a community you're
already part of. Then choose the three capstones that speak to it best. A portfolio aimed at online
shops might use the A3 support triage, the A1 lead pipeline (rebuilt for abandoned-basket follow-ups),
and the A7 hardened deployment; one aimed at clinics might use A1, A4 and A5.

Three unrelated projects read as "a developer who has done some things". Three related ones, with
an offer that ties them together, read as "the person who solves this problem for businesses like
mine". It's the same work, presented differently.

## Part 1: three case studies

Each case study is a page with this structure, result first:

| Section | Contents |
|---------|----------|
| Headline | a measured result and a kind of business: `Tickets needing a person down 93% for an online bike shop` |
| For | one line: who this is for |
| Links | the demo video and the code |
| Result | the period or test set it was measured on, then two to four before-and-after lines, then their sources |
| Problem | the situation in plain language: who, what, how often, what it cost |
| Approach | three to five steps an owner would understand |
| Built with | one line of tools, for technical readers |
| Limits | what it doesn't do, where a person stays in the loop, and what hasn't been tested yet |
| Quote | one sentence from a client, if you have a real one (optional) |

### Numbers you can defend

Your capstones ran against fakes and test sets, not live clients, and that's fine, as long as you
say so. Honest sources for capstone numbers:

- **Eval results** from A2, A4 and A7: "93% routed correctly on the 200-ticket test set", "recall@5
  of 0.86 on 40 questions".
- **Time and cost measurements** you ran: "median 1.4 seconds per ticket, about 0.002 per ticket in
  AI usage at the prices on the date of the run".
- **A realistic before**, stated as an estimate with its basis: "sorting by hand at about 90 seconds
  a ticket (our timing of 50 tickets)".
- **Real client results**, if you've done paid or volunteer work since A1, with written permission.

Each metric names its source and date. A test-set result is never described as a live result: the
headline for a test-set study says so in its Result section ("Measured on a 200-ticket test set, not
live traffic"), and its Limits section says the system hasn't run on a live inbox yet.

### Anonymising

For real clients, get written permission first. Then, for every case study, real client or not:

- replace the client's name, and anything unique enough to identify it, with a description ("an
  online bike shop");
- remove people's names, emails and phone numbers, including those inside links, alt text and
  screenshots;
- round private figures ("about 12,000 a month");
- use only fake data in screenshots and demo videos.

`portfolio.py` does the text part: it replaces the names you list, and its check fails if a real
name or any contact detail survives in the output. Then read every page yourself. Automated
anonymising is a first pass, not a guarantee.

### READMEs and demos

Update the README of each project the case study links to, so a client who clicks through isn't
lost. The first screen says who it's for, the problem, and the result with a number, then links the
demo and the case study; the how-to-run section comes after. Record a demo of two to three minutes
for each: the "before" in one sentence, the trigger happening, the result appearing, one failure
being handled (a bad input, a provider timeout), and what it costs to run. Unlisted video links
are fine.

## Part 2: one productised offer

Turn your niche and your case studies into one offer with a fixed scope, price and timeline, on a
single page:

| Section | Contents |
|---------|----------|
| Name and "for" | the offer in a few words, and who it's for, with a size ("50 or more support emails a day") |
| The problem | one or two sentences, in the client's words |
| What changes | the result to expect, as specific as your case studies support |
| What's included | a list where every item can be counted: queues, question types, integrations, training hours |
| Not included | the things a buyer might assume are included |
| Timeline and price | weeks from the deposit, a fixed build price, an optional monthly care plan, and how AI usage is billed (who pays the provider, the margin, the estimate, and the cap) |
| Assumptions | what must be true for the price and timeline to hold |
| Next step | one concrete, small action, such as "a 30-minute call to look at last week's inbox together" |

Price it with lesson 3's tools: your floor rate, your hours estimate from building the capstone
(the second build is faster, but not free), a risk buffer, and a check against the first-year value
for a typical client. Write the currency on the page. Put a short SLA summary in the care plan
(response time, what's monitored, what isn't promised), using lesson 5's rules.

## Part 3: outreach

Write an `outreach.md` with:

- **A first message** of under 120 words: a personal note placeholder, one sentence on what you do and
  for whom, one result from a case study, a link, one easy question, and an easy way to say no.
- **One follow-up**, sent a week or more later, and only once.
- **A list of at least 10 businesses** that fit the offer: the company, the role you'd write to,
  the source (referral, community or cold), and why you chose it. Contact details live in your own
  CRM or spreadsheet, **never** in the public repository.

Start with the warm ones: people you know, people who've asked for help in communities you take part
in, and past colleagues. No scraped or bought lists, and no personal addresses you weren't given.
Check the rules on marketing email where you and they are.

## Using `portfolio.py`

`starter.py` (save it as `portfolio.py`) is a small, standard-library script that renders all
three parts as markdown from structured data, and checks them. It has one example case study, an
example offer and two example prospects. Replace the data at the bottom of the file with your own:
a `CaseStudy` per project, your `Offer` and your `Prospect` list.

```text
$ python portfolio.py
wrote out/case-studies/support-triage.md
wrote out/offer.md
wrote out/outreach.md

  - 1 case study; the capstone needs 3
  - support-triage: no demo link yet
  - outreach: Northfold Outdoor is cold and has no personal note
3 problem(s)
```

That's the example data as shipped, and its three problems are the checks doing their job. The
example case study renders like this:

```text
# Tickets needing a person down 93% for an online bike shop

**For:** Online shops whose support inbox takes someone's whole morning
[Code](https://github.com/your-name/support-triage)

## Result
Measured on a 200-ticket test set, not live traffic:
- Tickets needing a person: 200 → 14 of 200 (-93%)
- Tickets routed to the right queue: 71 → 93% (+22 points)

Sources: tickets needing a person: eval run on the 200-ticket test set, 2026-09-14; tickets routed to the right queue: same run; before is the old keyword rules

## Problem
The support inbox at an online bike shop mixed refunds, delivery questions and damaged parcels, and one person sorted every email by hand before anyone could answer it.

## Approach
1. Collected 200 real-looking tickets and the queue each one belongs in, to test against
...
```

Its checks fail when:

- there are fewer than three case studies, or a case study has no numbers, a metric without a
  source, a headline metric with no "before", or no demo link;
- a real name you listed, an email address or a phone number appears in the published text;
- an offer item is vague ("improve", "optimise", "seamless") or can't be counted, there's no
  out-of-scope list or price, or the AI terms don't mention a cap;
- the first outreach message is over 120 words, a prospect has an email address in the list, or a
  cold prospect has no personal note.

`python portfolio.py --check` runs only the checks and exits with 1 if any fail, so you can run it
in a GitHub Actions workflow on every push. Change the templates freely: the structure matters,
not the exact wording. If you'd rather write the pages by hand, or in your site's own tooling,
that's fine too, as long as they follow the same structure and pass the same checks by eye.

## Try these

Before you submit, check each of these:

- Add a staff member's name to a case study's problem text without listing it in `names`, and
  confirm that the check doesn't catch it. That's why you read every page yourself.
- Put an email address inside a link in a case study's limits (`?email=someone@example.com`) and
  confirm that the check fails.
- Read each headline aloud to someone who isn't a developer, and ask what they think was built.
- Work out the offer's payback for a typical client with `roi_summary()` from lesson 3. If it's
  over a year, fix the offer or the price before you send anything.
- Send the first message to a friend who runs a business, and ask what they'd reply.

## Stretch goals

- **A one-page site** generated from the same data, with the offer at the top and the three case
  studies below, deployed to any static host, fast on a phone.
- **A pricing page** with two or three versions of the offer (a pilot, the standard build, the
  build with a care plan), each with its scope and price.
- **A real case study.** Do one small paid or volunteer project for a local business, from the
  discovery call to the handover, and replace your weakest capstone case study with it.
- **A role-play rehearsal.** Run lesson 2's `rehearse()` with three personas from your niche, one
  of them difficult, and write down the three questions you'll now always ask.

## How to submit

Submit one link on this capstone's page: your site, or a GitHub repository or profile README that
links everything. The review follows the links to the three case studies, the three project
READMEs and their demos, the offer and the outreach file, and reads them against the criteria. It
checks that every number has a source, that nothing identifies a client or a person, that the
offer can be bought as written, and that the outreach is something you'd be happy to receive. If
you used `portfolio.py`, include it and your data, so the review can run `python portfolio.py
--check`.

Then send the first message. The capstone is graded on the link; the business starts with the
reply.
