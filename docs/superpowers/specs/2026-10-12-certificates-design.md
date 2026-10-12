# Certificates: design

Date: 2026-10-12 · Owner: Raza Awan · Status: approved in chat; spec for review

## Purpose

Two certificates a learner can share as a credential (a CV, LinkedIn), each with a public page that
proves it's real:

- **Python:** for the black belt.
- **AI automation:** for the 9th dan.

They certify ability, in keeping with Principle 1, "Mastery over completion": each one states what
was verified, not just what was finished.

## Decisions (owner's choices, 2026-10-12)

| Question | Decision |
|---|---|
| What they're for | A credential to share: a unique ID, a public verification page and a downloadable PDF. Nothing is public until the learner claims it |
| What earns them | Python: the black belt grading itself. AI automation: all 8 automation modules passed (the 9th dan) |
| Issuing | The learner claims it, confirming the name to print. They can withdraw (and restore) the public page |
| How it's produced | The verification page is the certificate: an A4-landscape design with a print stylesheet ("Download PDF" is the browser's Save as PDF), plus the same design as a PNG through next/og for share previews and an image download. No new dependencies |
| When it's built | After the 2026-10-12 refine/fix pass (the critique's phases 2–5) |

## Eligibility

Checked on the server every time, from the rules that already exist; a certificate is never earned
by a client claim.

- **Python** (`track: "python"`): `getBlackBeltStatus(userId).met` from `lib/black-belt.ts`:
  - all 16 Python modules passed;
  - the advanced topics held through reviews (mastery target 0.8);
  - three capstones approved, or passed in GitHub Actions.
- **AI automation** (`track: "automation"`): every module of the `automation` track passed
  (`getCurriculumState`: `modulesPassed === modules.length` for that track, and greater than 0). That
  is the 9th dan, the last entry of `DAN_TRACK` in `lib/ranks.ts`.

A learner who stops meeting a rule later keeps the certificate. A black belt earned once is not
taken back.

## Data

A new model, with a migration (`prisma migrate deploy` in production, already on the launch
checklist):

```prisma
model Certificate {
  id          String    @id @default(cuid())
  /// Public ID printed on the certificate and used in its URL: PL-PY-XXXX-XXXX or PL-AI-XXXX-XXXX
  code        String    @unique
  userId      String
  /// "python" | "automation"
  track       String
  /// The name printed, as the learner confirmed it when claiming
  name        String
  issuedAt    DateTime  @default(now())
  /// Set while the holder has withdrawn the public page
  withdrawnAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, track])
  @@map("certificates")
}
```

The code's 8 characters come from Crockford base32, with no ambiguous letters. They're generated
randomly and retried on the rare collision. The code is the URL, so nothing about the learner's
account appears in it.

## Claiming

- **The card:** when a learner is eligible and hasn't claimed it, a "Claim your certificate" card
  appears in the dashboard's "next" band (built in phase 3 of the refine work) and in the profile's
  Certificates section.
- **The dialog:**
  - It has the feel of the white-belt ceremony.
  - It shows a live preview of the certificate.
  - It asks for the name to print, pre-filled with the account name, 2–80 characters, trimmed. A
    note under it: "Use the name you'd put on a CV."
  - "Issue my certificate" creates it and goes to its page.
- **The API:**
  - `POST /api/certificates` with `{ track, name }` claims a certificate:
    - signed in only;
    - eligibility checked;
    - idempotent: a second claim returns the existing certificate;
    - rate-limited.
  - `PATCH /api/certificates/[code]` with `{ name }` or `{ withdrawn: boolean }`, holder only, so
    the holder can fix the printed name or withdraw and restore the public page.

## Pages

### `/certificates/[code]`: the certificate (public, no sign-in)

- **On screen:** the certificate as an A4-landscape sheet (297 × 210 mm, aspect √2:1), scaled to the
  column width, readable on a phone without sideways scrolling.
- **Verification line:** under the sheet, in plain text: "Issued by pylearn to {name} on {date} ·
  ID {code} · {url}".
- **Holder-only controls:**
  - **Download PDF:** `window.print()`. The print stylesheet prints exactly one A4 landscape page
    with no app chrome, and the page title gives the file its name: "{name}, pylearn {certificate}".
  - **Download image:** the PNG.
  - **Copy link.**
  - **Add to LinkedIn:** LinkedIn's add-certification link, with the certificate's name,
    organization "pylearn", issue month and year, the page's URL and the ID pre-filled.
  - **Change the printed name.**
  - **Withdraw / Restore.**
- **Metadata:** `robots: noindex`, so a learner's name stays out of search engines (sharing still
  works). The og:image is the PNG, so a shared link shows the certificate.
- **Withdrawn:** a neutral notice, "This certificate's holder has withdrawn its public page." It shows
  no name and returns a 404 status. The holder still sees it, with Restore.
- **Unknown code:** a 404.

### `/certificates/[code]/image`: the PNG

- The same design rendered by `ImageResponse` from next/og, at 1600 × 1131.
- It serves as the og:image and the image download.
- Withdrawn and unknown codes return a 404.

### The profile's Certificates section

Each of the two certificates in one of three states:

- **Not yet:** what's left, in a line. For example: "Pass 4 more modules for the black belt"; for
  automation, "opens after Python module 14".
- **Ready to claim:** a Claim button.
- **Issued:** a link to its page, plus its ID.

## Visual direction

A grading certificate (a *menjo*) in the printed-syllabus world of DESIGN.md: jade and straw on
sheet paper, flat, no gradients, the app's own marks.

- **The sheet:**
  - The `sheet` paper colour, with a keyline frame and an inner stitched rule (the belt band's stitch
    language).
  - Generous margins, on a grid that fits A4 landscape exactly.
- **Top band:**
  - The pylearn wordmark and knot.
  - The certificate's title, in Archivo condensed: "Black belt in Python" or "AI automation, 9th dan".
- **The rank:**
  - The belt band at large scale: the black belt, or for automation the black belt with eight
    straw dan stripes.
  - Beside it, the rank numeral at poster scale ("1st dan", "9th dan") in the Rank Numeral style.
- **The holder:**
  - The printed name is the hero line: the largest type after the numeral.
  - Above it, a one-line statement: "This certifies that".
  - Below it, what was verified:
    - **Python:** "passed all 16 modules of the Python syllabus, held the advanced topics through
      spaced review, and had three capstone projects approved".
    - **Automation:** "passed all eight modules of the AI automation track, from workflows and LLM
      APIs to agents, MCP servers and production systems".
- **Foot:**
  - The issue date, the ID and the verification URL in Mono.
  - The examiner's seal ("Certified", with the track) pressed into the lower right corner, clear of
    any text.
- **Claims:** "Awarded by pylearn." Nothing about accreditation or partners, and no invented
  signatures.
- **Dark theme:** the certificate always renders as paper (light), in both the page and the PNG,
  because it's a document.

## Accessibility

- The certificate is real text in reading order: the title, then the name, the statement, the date
  and the ID. The belt and seal are decorative (`aria-hidden`), described in the statement.
- The holder's controls are buttons with names. Withdraw asks for confirmation, and the result is
  announced.
- The claim dialog follows the existing dialog patterns: focus trap, Escape, and focus returned
  afterwards.

## Out of scope

- Certificates for individual belts or dan grades.
- Physical printing or shipping.
- Revocation by an admin (there's no use for it yet; the black belt isn't taken back).
- Server-generated PDF files.

## Testing

- **Unit:**
  - The code format and alphabet.
  - The automation eligibility helper.
  - The LinkedIn add-to-profile URL builder.
  - Name validation.
- **Integration:**
  - Claiming refuses an ineligible learner.
  - Claiming issues once (a second claim returns the same certificate).
  - Changing the name and withdrawing/restoring are holder-only.
  - The public page data hides a withdrawn certificate's name.
- **Browser** (throwaway accounts made eligible in the test database):
  - The claim flow from the profile.
  - The certificate page at desktop and phone widths.
  - The holder controls.
  - Print: `Page.printToPDF` with the print stylesheet yields exactly one A4 landscape page.
  - The PNG route.
  - axe.
