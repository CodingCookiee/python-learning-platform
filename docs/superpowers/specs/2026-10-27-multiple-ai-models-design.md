# Multiple AI keys and a model switcher: design

Date: 2026-10-27 · Status: approved 2026-10-27, built on `dev` the same day · Ships: v1.1, right after launch

## Purpose

Learners bring their own AI key. Today they can save exactly one key, with one model, and every AI feature uses it. This change lets them:

- save a key for each provider (Anthropic, OpenAI and Google), so they can use all three;
- switch model where they use the AI (the tutor, the Sensei and capstone reviews), without going to Settings.

It's the pattern of other bring-your-own-key tools (Cursor, LibreChat, TypingMind), and it fits how the features are used: a quick, cheap model for a Sensei question, a stronger one for a capstone review. If one provider is down or rate-limiting, the learner switches to another instead of waiting.

## Decisions (owner's choices, 2026-10-27)

| Question | Decision |
|---|---|
| When | Right after launch, as v1.1. v1 launches with the one-key setup it was tested with |
| Keys | One per provider, so up to three. One key already unlocks every model of its provider, so several models from the same provider need no extra key |

## What doesn't change

- **A learner with one key still gets the menu,** listing that provider's models. (Changed while building: one key covers all of a provider's models, so hiding the menu would remove the "same provider, different models" case.)
- **The daily cap is per learner, not per key:** 150 calls a day across every key and model (`DAILY_CALL_LIMIT`).
- **Keys are encrypted the same way,** bound to the user id and never sent to the browser. Only the last four characters are, as today.
- **The AI stays off where it's off:** the Sensei during gradings, and the tutor's grading rules.

## Data

`AiCredential` holds one key per learner per provider. Exactly one of a learner's keys is the default.

```prisma
model AiCredential {
  id           String   @id @default(cuid())
  userId       String                  // no longer @unique
  provider     String                  // anthropic | openai | gemini
  model        String                  // this key's model when it's used by default
  isDefault    Boolean  @default(false)
  encryptedKey String   @db.Text
  keyHint      String
  ...
  @@unique([userId, provider])
}
```

On `User`, the relation `aiCredential AiCredential?` becomes `aiCredentials AiCredential[]`.

**Migration** (`2026110x_ai_keys_per_provider`). It's additive, with no data lost:

1. Drop the unique index on `userId`.
2. Add `isDefault` and the unique index on `(userId, provider)`.
3. Mark every existing key as the default (`UPDATE ai_credentials SET "isDefault" = true`), since each learner has at most one today.

It goes on WHATS-LEFT for production.

## Settings: "Your AI keys"

`app/(app)/settings/_components/ai-settings.tsx` becomes a list of up to three rows, one per provider. Each row shows:

- the provider and the key's last four characters;
- its model, with the same picker as today (`MODEL_SUGGESTIONS`, or type any model the key can use);
- **Test** (the existing `/api/settings/ai/test`, given the provider), **Remove**, and a **Use by default** choice.

Below the list, "Add a key for another provider" offers only the providers without a key yet.

- The first key saved becomes the default.
- Removing the default makes another remaining key the default.

The API, `app/api/settings/ai/route.ts`:

- `GET` returns `{ credentials: CredentialSummary[], usage, available }`. Each summary gains `provider` (already there) and `isDefault`.
- `PUT { provider, model, apiKey?, isDefault? }` saves the key for that provider. Without `apiKey`, it keeps the stored key, which is how the learner changes the model or the default.
- `DELETE { provider }` removes one key.

## The switcher

A small menu in the header of each AI surface, showing the model in use, e.g. "Claude Sonnet 5.5 ▾". It lists:

- every saved key's provider as a group heading, with its suggested models (`MODEL_SUGGESTIONS`) and the key's own model if it was typed;
- "Other models and keys in Settings", a link. (Changed while building: a text box inside a menu is awkward to use; a model typed in Settings becomes the key's model and joins the menu.)

Where it goes:

| Surface | File | Remembered as |
|---|---|---|
| The tutor (on drills) | `components/tutor/tutor-panel.tsx` | `tutor` |
| The Sensei | `components/sensei/sensei-assistant.tsx` | `sensei` |
| A learner's capstone AI review | `components/projects/ai-review-panel.tsx` | `review` |
| The examiner's AI review | `app/(app)/admin/projects/[submissionId]/evaluate/_components/evaluate-client.tsx` | `examiner` |

- **Remembered per surface,** in the browser, through `accountKey()` in `lib/account-storage.ts`. That way it's cleared on sign-out like the rest of an account's browser data, and one account's choice never shows for another account in the same browser.
- **A remembered model whose key has gone** falls back to the default without a message.
- **Switching during a Sensei or tutor conversation keeps the conversation.** The turns are plain text, so the next answer comes from the new model with the history intact. The first reply from the new model says "Answered by GPT-5 mini" under it.
- **Branded per DESIGN.md:** the menu is a brand menu wearing the learner's belt edge, the trigger has the pointer cursor and an accessible name ("Model: Claude Sonnet 5.5"), and it works from the keyboard and at phone width.

## Server

`callWithLearnerKey(userId, feature, req, extra)` in `lib/ai/credentials.ts` gains an optional `choice: { provider, model }`:

- **With a choice,** it loads that provider's key (`findUnique({ where: { userId_provider } })`) and uses that model.
- **Without one,** it uses the default key and its model.
- **A provider with no key** gets 409 `no_key` with "Add a key for OpenAI in Settings to use GPT-5 mini." It never falls back silently to another provider, because the learner pays.
- **The model name** is checked with the same rule as Settings (`/^[\w.:/-]+$/`, at most 100 characters).

The routes pass `choice` from their request body:

- `app/api/tutor/route.ts` and `app/api/sensei/route.ts` (each with `choice` added to its body schema);
- `app/api/projects/[id]/review/route.ts`;
- `app/api/admin/projects/submissions/[submissionId]/ai-review/route.ts`, through `lib/ai/review-submission.ts`.

`LlmUsage` already logs the provider and model of each call, so the usage summary in Settings can split by model with no schema change. The admin usage report, `lib/ai/usage-report.ts`, counts keys by provider, which still works.

Places that ask "does this learner have a key?" change from `findUnique({ where: { userId } })` to `count({ where: { userId } }) > 0`:

- `app/api/sensei/route.ts` (GET);
- `app/(app)/exercises/[id]/page.tsx`;
- `lib/project-detail.ts`;
- the evaluate page (`app/(app)/admin/projects/[submissionId]/evaluate/page.tsx`).

The admin user page lists every key's provider and model (`lib/admin/users.ts`, `app/(app)/admin/users/[id]/page.tsx`).

## Copy

- **Privacy and terms:** "your own key" becomes "your own keys", and say the request goes to the provider of the model you chose.
- **Error messages:** name the provider ("Your OpenAI key was refused. Check it in Settings").
- **Help text in Settings:** "One key works for all of a provider's models. Add another provider's key to switch between them."

## Tests

- **Unit:**
  - the default rules: the first key becomes the default, and removing the default promotes another;
  - the switcher's model list for zero, one and three keys;
  - the fallback when a remembered model's key has gone.
- **Integration (real database):**
  - the migration keeps an existing key as the default;
  - the unique key per provider holds;
  - `callWithLearnerKey` with a choice, with no choice, and with a provider that has no key (409, nothing logged);
  - the daily cap counts every key together.
- **End to end:**
  1. Add two keys in Settings.
  2. Switch model in the tutor and in the Sensei.
  3. Check the conversation carries on, and that the choice is remembered after a reload and cleared on sign-out.

  Use simulated replies, as today's AI tests do.
- **Look at it:** Settings with zero, one and three keys, and the switcher open on each surface. Desktop and phone, light and dark, axe-clean.

## Out of scope

- Several keys for one provider, e.g. a personal and a work key (not chosen).
- Choosing a model per message, or comparing two models' answers side by side.
- Falling back to another provider automatically when one fails. The learner switches; we don't spend another key on their behalf.
