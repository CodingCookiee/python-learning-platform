# Launch tasks

Your checklist for putting pylearn live, in the order to do it. Every task here needs your accounts or your decision; none of it is code. The reasons and the detail behind each step are in [WHATS-LEFT.md](WHATS-LEFT.md) §1–§4 and [DEPLOYMENT.md](../DEPLOYMENT.md).

Written 2026-10-27.

## 1. Get the code ready

- [ ] **Commit the waiting changes** on `dev` (the bot check, the reading limit, the upload fix, the docs), then merge `dev` into `master`. Vercel deploys production from `master` unless you pick another branch in its settings.
- [ ] **Make the GitHub repo private.** It's public, and `content/` holds every lesson and every solution. GitHub → the repo → Settings → General → Danger Zone → Change visibility.
- [ ] **Read and approve the terms of use** at `/privacy`. I drafted them; they aren't a lawyer's work. They name no governing law, so add which country's law applies once you know where pylearn is based.

## 2. Set up the services

Write each value straight into your password manager as you go, never into a file in the repo.

- [ ] **Buy `pylearn.academy`** (Cloudflare or Namecheap).
- [ ] **Neon, the database:** a new project for production, in **AWS us-east-1**. Copy two connection strings:
  - the **pooled** one becomes `DATABASE_URL`;
  - the **direct** one becomes `DIRECT_URL`.
  - End both with `sslmode=verify-full`.
- [ ] **Upstash, the rate limits:** a new Redis database, in **us-east-1**. Copy its REST URL and token: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- [ ] **Resend, the email:**
  1. Add the domain `pylearn.academy`.
  2. Add the DNS records it shows (SPF and DKIM) at your registrar, and wait until Resend says the domain is verified.
  3. Create an API key: `RESEND_API_KEY`.
  4. Pick the sender, for example `pylearn <hello@pylearn.academy>`: `EMAIL_FROM`.
- [ ] **A contact address,** for example `hello@pylearn.academy`, forwarded to you by your registrar: `CONTACT_EMAIL`. Not your personal address.
- [ ] **Two new secrets.** Run this twice in Git Bash, once for each, and don't reuse the dev values:
  ```
  openssl rand -base64 32
  ```
  The first is `AUTH_SECRET`, the second `ENCRYPTION_KEY`.
- [ ] **Optional extras:**
  - a GitHub token: `GITHUB_TOKEN`. It raises GitHub's API limit for checking learners' GitHub Actions runs.
  - "Sign in with GitHub": a GitHub OAuth app whose callback URL is `https://pylearn.academy/api/auth/callback/github`. That gives `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
  - "Sign in with Google": a Google OAuth client whose redirect URI is `https://pylearn.academy/api/auth/callback/google`. That gives `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

## 3. Create the Vercel project

- [ ] **Import the GitHub repo** into a new Vercel project.
- [ ] **Set the variables** in the Production environment:

  | Variable | Value |
  |---|---|
  | `DATABASE_URL` | Neon, pooled |
  | `DIRECT_URL` | Neon, direct |
  | `AUTH_SECRET` | the first secret |
  | `ENCRYPTION_KEY` | the second secret |
  | `AUTH_URL` | `https://pylearn.academy` |
  | `NEXT_PUBLIC_APP_URL` | `https://pylearn.academy` |
  | `ADMIN_BOOTSTRAP_EMAIL` | the email you'll sign in with |
  | `GRADING_MODE` | `client` |
  | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash |
  | `RESEND_API_KEY`, `EMAIL_FROM` | Resend |
  | `CONTACT_EMAIL` | the contact address |
  | `GITHUB_TOKEN`, `AUTH_GITHUB_*`, `AUTH_GOOGLE_*` | only if you made them |

  Leave `BOT_CHECK` and `PASSWORD_BREACH_CHECK` unset.
- [ ] **Check these settings:**
  - **Fluid compute is on** (the default). Without it, AI replies cut off after 10 to 15 seconds.
  - **OIDC federation is on**, in the project's security settings. The bot check needs it.
  - **Previews:** turn them off (Settings → Git), or connect Neon's Vercel integration so each preview gets its own database branch. Never give Preview the production `DATABASE_URL`.

## 4. Deploy

- [ ] **Deploy.** The build checks the settings, then applies every database migration to production, then builds.
- [ ] **Read the build log:**
  - the migrations show as applied;
  - there are no `[pylearn] Missing production setting` lines. If there are, set what they name and redeploy.
- [ ] **Add the domain** in Vercel: `pylearn.academy` as the primary, and `www.pylearn.academy` redirecting to it. Set the DNS records Vercel shows, and wait for the certificate.
- [ ] **Sign in as the admin straight away,** before telling anyone about the site:
  1. Sign up with `ADMIN_BOOTSTRAP_EMAIL`.
  2. Click the confirmation link in the email.
  3. Sign in, and check that `/admin` opens.

  The first confirmed sign-in with that address becomes the super admin. After that, no one else can.
- [ ] **Load the course.** In Git Bash, from the repo, with production's connection strings pasted in place of the dots:
  ```
  DATABASE_URL="..." DIRECT_URL="..." npm run content:sync
  ```
  Then press **Refresh public pages** in Admin → Content. Run the sync again whenever `content/` changes.

## 5. Test it live

- [ ] **Go through it as a new learner,** with a second email address:
  1. Sign up, and confirm the email.
  2. Pass a lesson's drills.
  3. Take a grading.
  4. Reset the password.
- [ ] **Watch for the bot check.** If sign-up, sign-in or "resend the link" says "We couldn't tell this came from a person", set `BOT_CHECK=off`, redeploy, and tell me. If the function logs say `[bot-check] BotID unavailable`, turn on OIDC federation (step 3).
- [ ] **Try the AI with your own key:**
  1. Add the key in Settings.
  2. Open a pending capstone in Admin → Projects and press **Review with AI**.
  3. Try a learner's own **AI review** on a capstone page.
- [ ] **LinkedIn:** open a certificate page while signed in to LinkedIn, and press **Add to profile**.

## 6. Tell the world

- [ ] **Put the website on your profiles:** set `https://pylearn.academy` as the website on the GitHub organisation and the LinkedIn page.
- [ ] **Google Search Console:**
  1. Add a Domain property for `pylearn.academy`, and verify it with the DNS TXT record.
  2. Submit `sitemap.xml`.
- [ ] **Bing Webmaster Tools:** "Import from Google Search Console".
- [ ] **Google's Rich Results Test** on `https://pylearn.academy`.

## 7. The first week

- [ ] **Look in once a day:**
  - Vercel's logs, for errors;
  - Upstash, for rate-limit hits;
  - Vercel's Firewall tab, for blocked bots;
  - Neon's dashboard, for slow queries.

## 8. After 2026-10-28

- [ ] **Ask me to upgrade `next` to 16.4.1** and make CI's security audit blocking again. It fixes two critical advisories in the current version. Neither affects pylearn today, but the upgrade shouldn't wait.
