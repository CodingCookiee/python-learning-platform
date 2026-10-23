# What's left

Updated 2026-10-23. The release QA of 2026-10-19 found the code ready for v1 ([the QA report](QA-REPORT-2026-10-19.md)). Where the project stands right now is in [STATUS.md](STATUS.md). The platform is built, and all the content is written: 25 modules (the on-ramp, 16 Python, 8 automation), 168 lessons and 24 capstones. The critique's product decisions, polish and quirks are done (section 5). What remains is **launching**: buying the domain, deploying, and checking the things that only work once the site is live, plus two checks that need your own accounts (section 4).

Domain: **pylearn.academy**. GitHub: [PL-PyLearn](https://github.com/PL-PyLearn). LinkedIn: [company/pylearn](https://www.linkedin.com/company/pylearn/).

---

## 1. Before launch

The release QA (2026-10-19) found the code ready for v1. What's left before launch is setup, plus one decision:

- [ ] **Decide: drills on the honour system for v1.** With `GRADING_MODE=client`, a learner who forges a request can mark drills and gradings passed (security report H-2). Capstones are still approved by an examiner, so certificates still need a person's sign-off. The real fix is the execution sandbox in v2 (ARCHITECTURE.md §17, M9). The alternative is holding the launch for it.
- [ ] **Set the Upstash variables.** Without them every Vercel instance keeps its own rate-limit counters, so sign-in and sign-up limits barely hold. The server logs a "Missing production setting" error at startup when they're absent.
- [ ] **Set up email (Resend, below).** Without it, sign-ups are verified on the spot and password reset is off. The startup check flags this too.
- [ ] **Sign in as the admin straight after the first deploy**, before announcing the site. The first verified sign-in with `ADMIN_BOOTSTRAP_EMAIL` becomes the super admin; after that, no one else can.

- [ ] **Buy pylearn.academy.** It was unregistered on 2026-10-14; buy it before someone else does (Cloudflare or Namecheap).
- [ ] **A production database.** A new Neon project for production, in **AWS us-east-1**: the app's functions run in Vercel's `iad1` (US East, set in `vercel.json`), and every page makes several queries, each one crossing the distance between the two. A new project is also cleaner than the dev database, which holds test accounts.
- [ ] **Email that reaches inboxes.** Gmail SMTP works but allows about 500 messages a day and can land in spam. For a public launch, use Resend on pylearn.academy: add the domain in Resend, set its DNS records (SPF, DKIM), then set `RESEND_API_KEY` and `EMAIL_FROM` (for example `pylearn <hello@pylearn.academy>`).
- [ ] **A contact address.** `CONTACT_EMAIL` shows on the Contact and Privacy pages. Use a project address, not your personal one; for example `hello@pylearn.academy` through your registrar's email forwarding.

## 2. Deploy (Vercel)

### Environment variables

Set these in the Vercel project's Production environment.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Production Postgres (Neon, pooled) |
| `DIRECT_URL` | yes | Neon's direct connection, for migrations |
| `AUTH_SECRET` | yes | 32+ characters: `openssl rand -base64 32` |
| `AUTH_URL` | yes | `https://pylearn.academy`. It must also be available **at build time**: the sitemap and robots.txt are built with it, and so are the certificate links and share cards |
| `NEXT_PUBLIC_APP_URL` | yes | `https://pylearn.academy` |
| `ENCRYPTION_KEY` | yes | 32 bytes (`openssl rand -base64 32`). It encrypts learners' AI keys, and saving a key fails without it. If you reuse the dev database, use **the same key as dev**, or the saved keys can't be read |
| `ADMIN_BOOTSTRAP_EMAIL` | yes | Your sign-in email, so your account becomes the examiner (admin) |
| `GRADING_MODE` | yes | **`client`** for v1. `server` would re-run every drill's tests on the server, but it runs learner code inside the web server, where it can read the secrets (security report C-2). Safe server grading comes with the execution sandbox in v2 (ARCHITECTURE.md §17, M9) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | yes | Rate limits that hold across Vercel instances |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes (or Gmail) | Email verification and password reset. Without email, sign-ups are verified automatically and password reset is unavailable |
| `CONTACT_EMAIL` | yes | Shown on the Contact and Privacy pages |
| `GITHUB_TOKEN` | recommended | Raises GitHub's API limit for confirming learners' GitHub Actions runs |
| `AUTH_GITHUB_ID` / `_SECRET`, `AUTH_GOOGLE_ID` / `_SECRET` | optional | Sign in with GitHub or Google |
| `PASSWORD_BREACH_CHECK` | optional | Leave unset. `off` would skip the breached-password check |

### Steps

- [ ] Create the Vercel project from the GitHub repo, and set the variables above. Keep **Fluid compute** on (the default): the AI routes need up to 180 seconds (`maxDuration`).
- [ ] Deploy. The build runs `prisma migrate deploy` itself (`vercel.json`), so every migration is applied to the production database, including `20261012000000_examiner_ai_review`, `20261013000000_certificates`, `20261014000000_belt_test_out`, the admin migrations of 2026-10-15 and `20261015040000_blocked_emails`. Check the build log shows them applied.
- [ ] Check the function logs for `[pylearn] Missing production setting` lines, and set anything they name.
- [ ] Load the content: `npm run content:sync`. It syncs all modules, lessons, drills, capstones and achievements. Then, in Admin > Content, press **Refresh public pages** so the landing and About pages show the new numbers straight away.
- [ ] Add the domain in Vercel: `pylearn.academy` as the primary, and `www.pylearn.academy` redirecting to it. Then set the DNS records Vercel shows.
- [ ] Sign in with `ADMIN_BOOTSTRAP_EMAIL`, and check that `/admin` opens.

## 3. Right after launch

- [ ] **A real run-through on production, with email on:**
  - sign up;
  - the verification email arrives and works;
  - finish a lesson by passing its drills;
  - a grading;
  - a password reset.

  These flows have only been tested with email switched off.
- [ ] **The domain everywhere:** set `https://pylearn.academy` as the website on the GitHub organization (Settings → Profile → URL) and on the LinkedIn page. LinkedIn wants the full `https://…` form.
- [ ] **Search Console:**
  1. Add a **Domain** property for `pylearn.academy`, and verify it with the DNS TXT record. You can do this as soon as the domain is bought.
  2. Open Sitemaps and submit `sitemap.xml`. This needs the live site.
- [ ] **Bing Webmaster Tools:** "Import from Google Search Console". It also covers ChatGPT and Copilot search.
- [ ] **Google's Rich Results Test** on `https://pylearn.academy`. The code test already passed: two courses, no errors.
- [ ] **Re-run the SEO crawl on the live domain.** The localhost-only findings (HTTPS, HTTP/2) should disappear. The baseline is 85/100, in `.impeccable/review/seo/localhost-audit/` (a local folder that isn't committed).
- [ ] **Watch the first week:**
  - Vercel's logs for errors;
  - Upstash for rate-limit hits;
  - the Neon dashboard for slow queries.

## 4. Still to check yourself

These need your accounts, so they couldn't be tested here.

- [ ] **Capstone review with a real AI key.** Signed in as yourself (the examiner):
  1. Add your key in Settings.
  2. Open a pending capstone in Admin > Projects.
  3. Press **Review with AI**.

  Check that it ticks the checklist and drafts feedback. Also try a learner's own **AI review** on a capstone page. Both were tested only with simulated replies.
- [ ] **LinkedIn "Add to profile".** Open any certificate page while signed in to LinkedIn and press the button. The link uses the `/profile/add` format (certification name, pylearn as the organization, issue month and year, the certificate's URL and ID). Only LinkedIn's side is untested.
  - Optional: give the link your company page's numeric ID (`organizationId`), so the certificate shows the pylearn logo. The ID is in the page's admin URL (`linkedin.com/company/<number>/admin`); send it and I'll add it.

## 5. Done on 2026-10-14

- **Python certificate, end to end:** a test learner met the black belt by its real rule (16 gradings, 202 advanced drills held through review, three approved capstones), claimed through the dialog, landed on `PL-PY-…`, and the PNG rendered.
- **Certificate image:** its fonts are bundled in `assets/fonts/` and read from disk, so it no longer depends on Google Fonts.
- **Belt test-out (product decision):** one timed grading for the rest of a belt (two drills from each module still to pass). Passing it passes them all. It's offered on the belt's module pages and on the dashboard.
- **Lean dashboard (product decision):** the training log, the skill map, achievements and recent lessons moved to the profile, behind one "your record" link.
- **Learning log (product decision):** only the facts are drafted. "Learned" and "Stuck on" start empty, with the week's topics and unsolved drills as prompts.
- **Gradings in one sitting (product decision):** the start confirmation gives the finish time, and warns about a late-night start.
- **All 11 polish items:**
  - the dark-mode black belt;
  - "0 of 1 lesson";
  - review bars against the daily cap;
  - the examiner's buttons and short files shown open;
  - Settings saves (jade only when there's something to save);
  - module outcomes shown neutral until passed;
  - a "Hide" button for the tutor offer;
  - the landing page's automation modules folded;
  - the Record Figure token;
  - First Steps now counts Python lessons only;
  - the capstone review wait.
- **Known quirks:**
  - the on-ramp tests have room (all 72 integration tests passed);
  - `npm run build` clears the stale dev validator itself;
  - a regenerated Prisma client replaces the dev cache;
  - **Refresh public pages** shows a sync straight away.

- **End-to-end tests:** a Playwright suite (13 tests, `npm run build && npm run test:e2e`) and an `e2e` CI job. Writing it found two bugs, both fixed: links to a section of another page opened at the top, and the landing page's code samples weren't reachable by keyboard.

## 6. Smaller things noticed on the way

- [ ] **Landing height on phones:** folding the automation modules took it from about 11,100 px to 10,800. A real cut would need folding each belt's module list on phones too, or a shorter section.
- [ ] **The Prisma dev-cache fix** is in place but unproven until the next schema change. If a new model is missing after `prisma generate`, restart `npm run dev` as before.
- [ ] **From the critique, not yet done:**
  - the drill's test list repeats the results;
  - the certificate page shows the ID, date and URL twice;
  - the certificate page has no "how it was graded" block for verifiers.
- [ ] **Dead code:** `lib/code-execution.ts` (a client for an external runner that was never adopted) is imported by nothing, and `LAB_SIGNING_SECRET` is declared in `lib/env.ts` but never used. Both can go.
- [ ] **To check:** in the quest regression run of 2026-10-19, the developer's dashboard tour showed no pointer on its first stop ("Your belt"), while the beginner's did. The tour still completed. Not reproduced by hand yet.
- [ ] **Security follow-ups after launch,** in this order: end other sessions on a password change (M-2), then the low items (L-2, L-4, L-6, L-7, L-9). See the security report's status table.
