# Design and engineering principles

These are the principles the owner builds by, and they apply to every app they make. Read this before you design a screen or write a line of code, and come back to it whenever you choose how something should look, feel or behave.

The worked examples come from pylearn, a Python course the owner built as a martial-arts school: belts for ranks, gradings for exams, a sensei who guides. Your app will have its own world. Carry over the principle, never the dojo.

## Contents

- [The bar](#the-bar)
- [How the owner works with you](#how-the-owner-works-with-you)
- [Design](#design)
  - [Start with a world, not a screen](#start-with-a-world-not-a-screen)
  - [Brand every surface](#brand-every-surface)
  - [Make it personal](#make-it-personal)
  - [Colour](#colour)
  - [Type](#type)
  - [Shape and depth](#shape-and-depth)
  - [Layout and hierarchy](#layout-and-hierarchy)
  - [Stillness: no layout shift](#stillness-no-layout-shift)
  - [Motion](#motion)
  - [Every wait says what it's doing](#every-wait-says-what-its-doing)
  - [Empty, error and edge states](#empty-error-and-edge-states)
  - [Forms](#forms)
  - [Copy](#copy)
  - [Accessibility](#accessibility)
  - [Guiding new users](#guiding-new-users)
  - [The design system document](#the-design-system-document)
- [Engineering](#engineering)
  - [Root cause, then a regression test](#root-cause-then-a-regression-test)
  - [Industry standards, named](#industry-standards-named)
  - [Security and privacy by default](#security-and-privacy-by-default)
  - [Accounts and auth](#accounts-and-auth)
  - [Perceived speed](#perceived-speed)
  - [Code that reads like its neighbours](#code-that-reads-like-its-neighbours)
  - [Testing](#testing)
  - [Data and migrations](#data-and-migrations)
  - [Documentation as you go](#documentation-as-you-go)
- [Verifying before you call it done](#verifying-before-you-call-it-done)
- [Hard rules](#hard-rules)
- [Reporting back](#reporting-back)

## The bar

**Premium, never generic.** Every part of the app should feel intentional and personal, as if one person designed it end to end. Stock UI is what makes a product feel like a template: the library's spinner, a grey skeleton pulse, round confetti, a dashed box with a clip-art icon. The owner notices these and asks for them to be replaced.

When you're about to ship a library default, ask whether it's invisible plumbing (a focus outline, a scroll container). If anyone will look at it, build it from the brand.

## How the owner works with you

- **Short, fast messages**, often with typos, often with a screenshot. The screenshot is usually the whole bug report. Read it closely: "this", "here" and "these buttons" point into it.
- **New requests arrive while you're working.** Acknowledge each in a line, park the current work safely, handle the new request, and say where the earlier task stands. A bug they just hit comes before polish.
- **"How come?" asks for the root cause.** Say whether it was a bug or expected. If it was expected, name the standard behind it and show the evidence you checked. Then fix whatever needs fixing.
- **"Is this the industry standard?" is a real question.** Answer it directly, name the standard, then make or offer the fix.
- **"Go ahead", "do all", "fix it" mean act now** on everything listed.
- **They test like a real user**: several accounts in one browser, deleting accounts, following real emails, doing onboarding from the start. Test the same way.
- **Ask only for decisions that are genuinely theirs**: product behaviour, privacy trade-offs, anything outward-facing or hard to undo. Give multiple choice with your recommendation first, marked "(Recommended)", and a line of trade-off per option. Decide everything else yourself and say what you chose.
- **Their decisions stand.** If you argued one way and they chose the other, build their choice well.

## Design

### Start with a world, not a screen

Before the first screen, decide the product's world: one metaphor that every visual and every word can come from. pylearn is a martial-arts school, so progress is belts and stripes, exams are gradings, a pass gets a stamped seal, and the guide is a sensei. Because of that, a loader can be a belt being tied and a celebration can be offcuts of belt cloth. Nothing has to be invented from nothing.

From the world, define a small set of **signature objects** (pylearn has the belt band, the seal, the knot mark and the sensei), then tokens for colour, type, shape and motion. Every component is assembled from these.

### Brand every surface

These are the surfaces that default to generic. Give each one the product's own form:

| Surface | Generic | Branded (pylearn's example) |
|---|---|---|
| Page loader | Spinner | The logo mark being tied, in the user's colour |
| Button busy state | Spinner icon | A small solid version of the mark, in the button's ink, on a quicker loop |
| Long, staged wait | Progress bar | The signature object filling stage by stage (stripes taped onto a belt), plus lines naming each stage |
| Skeletons | Grey pulse | A slow sweep, like tape drawn across cloth |
| Empty state | Dashed box and a clip-art icon | One shared component: the "not yet" outline, a brand mark in an empty slot, what will fill it, and the next step |
| Celebration | Round confetti | Pieces of the world falling (strips of belt cloth with rank bars) |
| Dialogs, menus, tooltips | Plain white boxes | A band of the user's own colour along the top edge, keylined like the signature object |
| Toast | Stock check and alert icons | A tone rail carrying the brand's own marks, and a strip that runs down with the time left |
| Icons for things the product owns | Generic icon set | Its own glyph set, drawn on the same grid and stroke as the logo |
| 404 and error pages | Framework default | The product's voice and a signature object, plus clear ways back |
| Password field | Eye icon | Plain "Show" / "Hide" words |
| Destructive confirmation | Same as any dialog | The same dialog in the warning tone, with the risk spelled out and the name typed back |

Plain utility icons (arrows, close, external link) can stay from a library.

### Make it personal

Where the product knows something about the user, let the interface reflect it. In pylearn, the loaders, dialog edges, menus and celebrations take the user's current belt colour, so a green belt sees green. Put that state on the root element (`data-belt` on `<html>`) and drive the visuals from one CSS variable.

### Colour

- **Soft but alive.** The owner rejected a loud vermilion as "too dominant" and a washed slate as "too grey". The target is the balance between them: a calm, saturated-enough accent (jade green in pylearn) and a warm highlight used sparingly (straw yellow).
- **Tint the neutrals** toward the accent's hue. Never use pure grey or slate grounds.
- Define every colour as a **token in OKLCH**. Accent chroma sits around 0.10 to 0.13; avoid neon and saturated red.
- **Every token has a dark-mode twin**, tuned by eye. Check both themes every time.
- **Mix shadows and scrims from an ink token** (a deep tint of the brand), never raw black.
- Text on tinted grounds needs a slightly deeper "ink" variant to keep 4.5:1 contrast.

### Type

- **One display face for headings.** pylearn uses a condensed extrabold, so headings read like a printed syllabus. Use it for page titles, dialog titles and auth headings, at a consistent size per role.
- **Sentence case everywhere**: labels, buttons, menus, titles. Letter-spaced uppercase belongs to one signature object only (pylearn's seal), so it stays special.
- **Tabular numerals** for anything counted or compared.
- Keep prose lines to about 65 characters.

### Shape and depth

- **Pick one geometry and hold it.** pylearn is square-cut cloth: 0 to 3px corners and no pills or circles. Whatever you pick, every component follows it.
- **The page is flat.** Depth comes from two surface tones and hairline borders. Shadows belong only to surfaces that float over the page (dialogs, menus, toasts): one shadow for modal surfaces and one for non-modal ones. Never put a shadow on a card that sits on the page.
- **Hairlines and keylines** do the structural work that boxes and fills would otherwise do.

### Layout and hierarchy

- **The thing the page is for leads.** On pylearn's sign-in page the form originally lost to the decorative half, which had the biggest type, the brightest colours and the illustration. The fix: give the form the wider column (5:7) and the lighter surface, set its inputs into that surface, and step the decorative side back with smaller type, softer ink and a quieter ground. Check that the primary action is the strongest colour on the screen.
- **Align across columns.** Two-column layouts share one grid: top rows on one line, content starting on one line, footers on one baseline. Put the "other way in" link (sign in / create account) on the top row opposite the logo.
- **Rows over cards.** Lists are ruled rows with right-aligned meta. Lift the one row that matters onto a tinted field; don't box everything.
- **Give related controls room.** Two inputs side by side need about 200px each. If they get cramped, widen the column or stack them.
- **Focused flows fit the screen.** Sign-up, sign-in, reset password and confirm email show everything without scrolling on a 1366×768 laptop. Check 1440×900, 1366×768 and 1280×720, and a phone.
- **Phones get their own pass.** A layout that's fine on desktop and merely survives on a phone isn't done.

### Stillness: no layout shift

Content must never jump under the user's eyes or cursor.

- **Reserve space** for messages that come and go. Each form field keeps a line for its hint or its error, so the form never changes height.
- **Anchor dynamic content to the top, not the centre.** A centred form re-centres whenever its height changes, and that reads as bouncing. Hung from a fixed line, it can only grow downward.
- **Put late-arriving messages where they push the least.** A general error goes under the submit button; a field error goes in that field's reserved line.
- **Buttons keep one width** across their states ("Sign in", "Signing in…").
- **Return users to where they meant to go.** A link to a section of a streamed page waits for the section to arrive, then scrolls to it, and puts it back if the router scrolls to the top late.

### Motion

- **Motion is reserved for meaning**, mostly for earning something: a stamp landing, a stripe taping on, a celebration. Everything else changes in about 150ms, on colour or opacity.
- **Celebrate real accomplishment only**, and never block the next action behind it.
- **Respect reduced motion** everywhere: celebrations don't play, loaders hold still or breathe, sweeps stop.
- Loops (loaders) hold for a beat between cycles so they read as calm, not frantic.

### Every wait says what it's doing

A dead button or a blank page reads as broken, and users leave.

- **Busy buttons** show a short verb ("Saving…", "Creating your account…") at full opacity, keep their width, and stay busy through the navigation that follows.
- **Staged lines** name the real phases as they happen ("Running your code…", "Checking your tests…", "Saving your pass…"). Add a "still working" line after a few seconds and a "slow connection" line later.
- **Every route has a loading screen shaped like the page**, with a label saying what's loading.
- **Navigation starts its progress indicator before** `router.push`, so the click is acknowledged at once.
- **Guided steps sync with the action.** When a step depends on work in progress, show fillers ("Downloading Python, once…") instead of going quiet, then move on the moment the result appears.

### Empty, error and edge states

- **Empty states are designed, not left over.** Use one shared component that says what will fill the space and gives the next step. Never leave a dead end.
- **Errors say what happened and how to fix it**, in plain words, next to the thing that failed.
- **Status pages (404, 500)** carry the product's voice and offer real ways back.
- **Locked or not-yet states** have their own consistent look (pylearn: the dashed outline) and say what unlocks them.
- **Design the second account, the deleted account and the expired link.** These are where the bugs live.

### Forms

Follow current standards and say which:

- **Passwords (NIST SP 800-63B):**
  - 8 to 64 characters of anything, with no rules about symbols or capitals.
  - Refuse common passwords, runs ("12345678"), anything built from the user's own email or name, and passwords found in breaches. The breach check uses Have I Been Pwned's k-anonymity range API and lets the password through if the service is down.
  - A reset or change can't reuse the current password.
  - Say the rule before the user types.
  - Every password field gets a show/hide switch.
- **Sign-in asks only for a non-empty password.** Length rules are for choosing a password, not for typing one.
- **Names:** 1 to 60 characters in any script, with no links or markup. A name ends up in emails and admin views.
- **Email:** trimmed, lower-cased, compared case-insensitively.
- **Validate when a field is left**, then live while it's being fixed.
- **Tie each error to its input** with `aria-describedby`, and set `aria-invalid`.
- **Send server refusals about one field to that field**, focused.
- **Use the right `autocomplete` values** (`email`, `new-password`, `current-password`, `name`) and `enterKeyHint` on phones.
- **Forms use `method="post"`**, so credentials never land in the URL even before JavaScript loads.

### Copy

- **Plain language a beginner understands.** Short sentences. Say what to do, not just what's wrong.
- **A light touch of the world's voice** (belts, training, gradings in pylearn), never cute and never in the way.
- **Be honest:** about cost, about what's stored, about why something failed.
- **Name things by what they do for the user.** "Your next step", not "Continue".

### Accessibility

- **Pages are axe-clean** in both themes. Run axe in the end-to-end tests.
- **Every clickable shows the pointer.** That includes buttons, menu items, tabs, switches and labels. Disabled controls show not-allowed; busy ones show progress.
- **Keyboard everywhere:** visible focus rings, a skip link, sensible focus after dialogs open and close, and focus moved to the new heading when a view changes in place.
- **Announce outcomes once**, in a polite live region. Errors that block go in an alert.
- **Decorative visuals are hidden** from assistive tech, and anything meaningful has a text equivalent.

### Guiding new users

- **Guide with real actions**, game-tutorial style, not a tooltip tour. A guide character points at the real control and says what to do.
- **Stage each step by what the user actually does.** pylearn's "fix your first bug" has four stages: run the broken code, read the error (the pointer moves to the output), fix the line, run the tests. If the tests fail, it moves to "read what failed and try again".
- **A step completes only on a real accomplishment**, confirmed by the server. Running code isn't fixing it.
- **Optimistic, but honest.** Advance the moment the action succeeds in the browser, confirm with the server in the background, and never step backwards.
- **Reward the finish** with something earned (a badge, a farewell) and send them straight into real use.

### The design system document

Keep one `DESIGN.md` as the single source of truth: tokens, type roles, shapes, every signature component and its rules, and the don'ts. When you add or change a visual piece, record it there in the same change. New components start from it. If a pattern isn't in it, it's either a new decision to record or a mistake.

## Engineering

### Root cause, then a regression test

When something misbehaves, find out why before you change anything: query the database, trace the code, reproduce it in a browser as the user would. Fix the cause, not the symptom, and add a test that would have caught it.

Report the cause plainly. For example: "drafts were saved per drill, not per account, so a second account on the same browser opened the first one's solution".

### Industry standards, named

Default to the recognised standard, and name it: NIST SP 800-63B for passwords, OWASP ASVS for web security, WCAG 2.2 AA for accessibility. When the owner asks whether something is standard, the answer names the standard.

### Security and privacy by default

- **Keep only what you need.** To block an address without storing it, keep a keyed fingerprint (an HMAC). Store one-time tokens hashed.
- **Revoke on removal.** Deleting an account voids its sessions, its confirmation links and its reset links. A link that outlives its account is refused, never shown as a success.
- **Don't leak who has an account.** "If that email has an account, a link is on its way" is the same answer for every address.
- **Browser storage is per account.** Key drafts and chats to the signed-in user, and clear them on sign-out and on account deletion. Preferences like the theme can stay shared.
- **Secrets never appear in code, URLs or logs.** Encrypt user-supplied API keys at rest and show only their last four characters.
- **Rate-limit** sign-up, sign-in, password resets and every endpoint that costs money.
- **Set a nonce-based Content-Security-Policy** and the usual security headers.
- **Run untrusted code** in the user's browser, or in a real sandbox; never on the server bare.

### Accounts and auth

- Normalise and compare emails case-insensitively everywhere, including in the auth adapter.
- Accept OAuth sign-ins only from providers that report a verified email.
- **Roles follow least privilege.** pylearn has two admin levels: one reviews work and sees a read-only overview, the other has full control. Every admin action is guarded, logged to an audit trail, and can't remove the last full admin.
- Suspension blocks every way in. Deletion offers to bar the address from signing up again (admin deletions only).
- Notifications for staff go only to the level that needs them.

### Perceived speed

- **Preload what the next step needs** while the user reads (pylearn starts downloading Python on the first lesson).
- **Update optimistically and confirm in the background**, and make sure the confirmation survives a reload (`keepalive`).
- **Cache read-mostly lookups** for a few minutes; make the hot path a single query.
- **Measure on a slow database** and design the waiting states for it.

### Code that reads like its neighbours

- Match the surrounding naming, structure and comment density.
- **Comments explain why**, in plain sentences, not what the next line does.
- Build **one shared component per pattern** (`EmptySlot`, `LoadingButton`, `PendingLine`, `PasswordInput`) and use it everywhere. Never hand-build a second copy.
- **Keep each meaning in one place**: tokens in the stylesheet, guide lines in one file, rules in one module that both the browser and the server import.
- Keep scope tight. Fix what you break and the obvious adjacent bug you find, and say so.
- Frameworks move fast. Read the installed version's own docs before using an API, rather than trusting memory.

### Testing

- **Unit tests** for pure rules: validation, scoring, stage machines.
- **Integration tests** against a real database for data rules and API routes.
- **End-to-end tests** (Playwright) for every user-facing flow. Use page objects and fixtures, run axe checks, and give each test its own throwaway account, deleted afterwards.
- **Test like the owner does**: two accounts in one browser, a deleted account, an expired link, a slow network, a phone.
- A flaky test is a bug in either the test or the app. Find out which.

### Data and migrations

- Every schema change ships as a migration, additive where possible.
- Apply it to the dev database, regenerate the client, and list it in the launch checklist for production.

### Documentation as you go

Keep three living documents up to date, in the same change as the work:

- an **architecture log**: how the system is built, plus a dated note for each significant change and why;
- a **what's-left / launch list**: env vars, migrations and open decisions;
- the **design system** document, `DESIGN.md`.

## Verifying before you call it done

1. Type-check and lint the changed files: clean.
2. Unit, integration and end-to-end tests pass, with new tests for what you built or fixed.
3. **Look at it.** Build, run, and screenshot the real surfaces: desktop and phone, light and dark. Read the screenshots like a critic and list what's off: hierarchy, alignment, cramped controls, generic pieces, layout shift. Fix it all in one batch, check once more, and stop.
4. Drive each flow end to end in a browser with throwaway accounts.
5. For layout work, measure: does the page scroll at 1366×768, and does anything move when messages appear?

## Hard rules

- **Never commit or push** unless the owner asks. They commit themselves.
- **Never print, paste or log secrets.** If the owner pastes one, tell them to rotate it and never repeat it.
- **Test only with throwaway accounts** (an `@example.invalid` address). Leave the owner's own account and real users' accounts alone.
- **Leave the owner's dev server running.** Build tests into a separate output folder on another port, and tell the owner when their server needs a restart.
- **Keep personal details off public pages.** No personal name on the About page, contact addresses from config, and the organisation's own profiles as its links.
- **When a permission or safety check blocks you,** explain what you couldn't do and hand that step to the owner.
- **Use what's already installed** rather than downloading new executables.

## Reporting back

- Open with the outcome in plain words.
- Then what changed, grouped by what was asked, with file links.
- Then how you verified it (which tests ran, which screens you looked at) and anything that failed, with the output.
- Then anything the owner must do (restart a server, deploy a migration, rotate a key) and what's still open.
- State verified things plainly. Mark unverified things as unverified.
