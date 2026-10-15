/**
 * Browser storage that belongs to one account: drill and scratchpad drafts, the Sensei's chat, the
 * once-a-session pings. Keys carry the signed-in account (the app layout renders it as
 * `data-account`), so two accounts on one browser never see each other's code or conversation, and
 * signing out clears the account's keys. Preferences that aren't anyone's (theme, panel state) keep
 * plain keys.
 */

const ATTR = "data-account";

/** The signed-in account on this page, or "" outside the app (sign-in pages, the landing page) */
export function accountScope(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLElement>(`[${ATTR}]`)?.getAttribute(ATTR) ?? "";
}

/** `key`, for the signed-in account only */
export function accountKey(key: string): string {
  const scope = accountScope();
  return scope ? `${key}@${scope}` : key;
}

/**
 * Drafts were once kept under plain keys (`drill-…`, `scratch-…`, `sensei-chat`) that every account
 * on the browser shared; those are removed rather than handed to whoever signs in next.
 */
const LEGACY = /^(drill-|review-|checkpoint-|scratch-)[^@]*$|^sensei-chat$|^streak_pinged$|^milestone_seen_[^@]*$|^confetti_seen_[^@]*$/;

function sweep(storage: Storage, match: (key: string) => boolean): void {
  const doomed: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && match(key)) doomed.push(key);
  }
  for (const key of doomed) storage.removeItem(key);
}

/** On sign-out: everything this account left in the browser, and any unscoped leftovers */
export function forgetAccountStorage(): void {
  const scope = accountScope();
  const mine = (key: string) => (scope !== "" && (key.endsWith(`@${scope}`) || key.endsWith(`@${scope}:t`))) || LEGACY.test(key.replace(/:t$/, ""));
  try {
    sweep(localStorage, mine);
    sweep(sessionStorage, mine);
  } catch {
    // Storage blocked: there's nothing in it to clear
  }
}

/** Once per page load in the app: unscoped drafts from before keys were per account go */
let swept = false;
export function sweepLegacyStorage(): void {
  if (swept) return;
  swept = true;
  try {
    sweep(localStorage, (key) => LEGACY.test(key.replace(/:t$/, "")));
    sweep(sessionStorage, (key) => LEGACY.test(key.replace(/:t$/, "")));
  } catch {
    // Storage blocked
  }
}
