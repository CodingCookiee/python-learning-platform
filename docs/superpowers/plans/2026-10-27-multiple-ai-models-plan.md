# Multiple AI keys and a model switcher: plan

Date: 2026-10-27 · Spec: [2026-10-27-multiple-ai-models-design.md](../specs/2026-10-27-multiple-ai-models-design.md) · Ships: v1.1, after launch

Built on `dev` after the launch commit (`4d2dbca`), so launch can deploy without it.

## Steps

1. **Data.**
   - Schema: `AiCredential` loses `userId @unique` and gains `isDefault` and `@@unique([userId, provider])`. On `User`, the relation becomes `aiCredentials AiCredential[]`.
   - Migration `20261027000000_ai_keys_per_provider`: existing keys become defaults. Apply it to dev, run `prisma generate`, and list it in WHATS-LEFT.
2. **Shared model logic, browser-safe:** `lib/ai/models.ts`.
   - `SavedKey`, `ModelChoice` and `choiceSchema`;
   - `modelName()`, the switcher's groups (`modelGroups()`), and `resolveChoice()`, which says what to use when the remembered model's key has gone.
3. **Server keys:** `lib/ai/credentials.ts`.
   - `getCredentials()` and `getSavedKeys()`;
   - `saveCredential()` per provider, where the first key becomes the default and making one the default clears the others;
   - `deleteCredential(provider)`, which promotes another key when the default goes;
   - `callWithLearnerKey(…, { choice })`. A chosen provider with no key gets `no_key_for_provider`; `no_key` means the learner has no keys at all.
4. **Settings:**
   - the API: `GET` returns every key; `PUT` adds `isDefault`; `DELETE` takes `?provider=`; the test call takes a provider;
   - the page becomes a list of keys, each with Test, Use by default and Remove, above the same form, which now adds or edits one provider's key.
5. **The switcher:** `components/ai/model-switcher.tsx`.
   - `useModelChoice(surface, keys)` remembers the choice through `accountKey()`;
   - `ModelSwitcher` is the brand dropdown: models grouped by provider, a link to Settings for more.
6. **The surfaces,** each passing its saved keys instead of `aiReady`, with the switcher and `choice` in the request:
   - the tutor (exercise page → `ExerciseClient` → `TutorPanel`, `/api/tutor`);
   - the Sensei (`GET /api/sensei` returns the keys; `POST` takes `choice`). Each reply notes its model, and a switch is marked on the first reply from the new model;
   - the learner's capstone review (`lib/project-detail.ts` → `AiReviewPanel`, `/api/projects/[id]/review`, `reviewSubmission`);
   - the examiner's review (the evaluate page → `ExaminerAiReview`, its route, `reviewForExaminer`).
7. **Admin:** the user page lists every key.
8. **Copy:** in the privacy policy, keys (plural) and the model you choose.
9. **Tests:**
   - unit, for `lib/ai/models.ts`;
   - integration, for keys per provider, defaults, choices, and one daily cap across keys;
   - fix the probes and tests that assumed one key.
10. **Verify:**
    - tsc, eslint, unit and integration tests;
    - a build on :3010;
    - in the browser: Settings with three keys, then the switcher on the tutor, the Sensei and a capstone, desktop and phone, light and dark, with axe.
11. **Docs:** an ARCHITECTURE bullet, the migration in WHATS-LEFT, DESIGN.md for the switcher, and STATUS.
