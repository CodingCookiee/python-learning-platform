# Certificates: implementation plan

Date: 2026-10-13 · Spec: [2026-10-12-certificates-design.md](../specs/2026-10-12-certificates-design.md) (approved 2026-10-13)

## Steps

1. **Data:**
   - Add the `Certificate` model and its relation on `User`.
   - Write the migration `20261013000000_certificates` and apply it to the dev database with `prisma migrate deploy`.
   - Regenerate the client. The user's dev server must then be restarted, because it caches the Prisma client.
2. **Rules** (`lib/certificate-rules.ts`, pure code with unit tests):
   - Each track's wording: its title, rank, statement and seal.
   - The ID code: `PL-PY-XXXX-XXXX` or `PL-AI-XXXX-XXXX`, Crockford base32.
   - Name validation: 2–80 characters, trimmed, spaces collapsed, no control characters.
   - The LinkedIn add-to-profile URL.
   - Automation complete: every module of the automation track passed.
   - The "what's left" line for each track.
3. **Server** (`lib/certificates.ts`, with integration tests):
   - Eligibility, checked from the black-belt rule and the curriculum state.
   - `getCertificateStates(userId)`: not yet, ready, or issued, for each track.
   - `claimCertificate`: checks eligibility, issues once, and retries on a code collision.
   - `updateCertificate`: holder only; changes the name, or withdraws and restores the page.
   - `getCertificateByCode`: the data the public page reads.
4. **API:**
   - `POST /api/certificates` and `PATCH /api/certificates/[code]`, both signed in only.
   - A new rate limit, `certificateClaim`.
   - `/api/certificates` added to the proxy's protected API routes.
5. **The certificate:**
   - `components/certificates/certificate-sheet.tsx`: one design in real text. It scales with a container query: an A4-landscape composition at 640px and wider, and when printed; stacked below that, so it stays readable on a phone.
   - It always renders as paper: a `.paper` class re-declares the light tokens.
6. **The page** (`app/certificates/[code]`):
   - Public and `noindex`, with the og:image set to the PNG.
   - The holder's controls (client): Download PDF (print), Download image, Copy link, Add to LinkedIn, change the printed name, Withdraw/Restore.
   - The print stylesheet prints exactly one A4 landscape page.
   - A withdrawn or unknown code returns a 404 with one neutral notice. This deliberately departs from the spec, which gives each its own message: one notice never reveals whether a withdrawn certificate exists. The holder still sees their withdrawn certificate, with Restore.
7. **The image** (`app/certificates/[code]/image`):
   - Rendered with `ImageResponse` at 1600×1131, the same design in satori's flexbox.
   - Archivo is fetched as TTF from Google Fonts and cached; if the fetch fails, it falls back to the bundled font.
   - A withdrawn or unknown code returns a 404.
8. **Claiming:**
   - The profile's Certificates section shows each certificate's state.
   - A claim dialog shows a live preview, takes the printed name, and stamps the seal when the certificate is issued.
   - The dashboard band says "Claim your certificate" when one is ready (after reviews due and an open checkpoint).
9. **Checks:**
   - Typecheck, lint, unit and integration tests.
   - Browser checks with throwaway accounts made eligible in the database:
     - the claim flow;
     - the page at desktop and phone widths;
     - the holder's controls and withdraw/restore;
     - `Page.printToPDF`, which must give one A4-landscape page;
     - the PNG route;
     - axe.
