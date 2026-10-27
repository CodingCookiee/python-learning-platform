import { z } from "zod";
import { MODEL_SUGGESTIONS, PROVIDERS, type Provider } from "@/lib/ai/gateway";

/**
 * Which model answers: the learner's saved keys (one per provider) and the choice made where they ask.
 * Browser-safe, so the switcher and the server agree on what can be chosen.
 */

/** A saved key as the browser sees it: never the key itself */
export interface SavedKey {
  provider: Provider;
  /** The model this key runs by default */
  model: string;
  isDefault: boolean;
}

export interface ModelChoice {
  provider: Provider;
  model: string;
}

/** Letters, digits, dots, dashes, colons and slashes: every provider's model ids, and nothing that escapes a URL */
export const MODEL_ID = z
  .string()
  .trim()
  .min(1, "Choose a model")
  .max(100)
  .regex(/^[\w.:/-]+$/, "Model names are letters, digits, dots, dashes and colons");

/** The choice a request carries; without one, the default key and its model answer */
export const choiceSchema = z.object({ provider: z.enum(PROVIDERS), model: MODEL_ID }).optional();

/** The suggestion's name ("Claude Sonnet 5.5"), or the id itself for a model typed in Settings */
export function modelName(provider: Provider, id: string): string {
  return MODEL_SUGGESTIONS[provider].find((m) => m.id === id)?.name ?? id;
}

export interface ModelGroup {
  provider: Provider;
  models: Array<{ id: string; name: string }>;
}

/** What the switcher offers: for each saved key, its provider's suggested models, plus the key's own if it was typed */
export function modelGroups(keys: SavedKey[]): ModelGroup[] {
  return PROVIDERS.flatMap((provider) => {
    const key = keys.find((k) => k.provider === provider);
    if (!key) return [];
    const models = MODEL_SUGGESTIONS[provider].map(({ id, name }) => ({ id, name }));
    if (!models.some((m) => m.id === key.model)) models.unshift({ id: key.model, name: key.model });
    return [{ provider, models }];
  });
}

/** The model to use: the remembered one while the switcher still offers it, else the default key's */
export function resolveChoice(keys: SavedKey[], remembered: ModelChoice | null): ModelChoice | null {
  if (
    remembered &&
    modelGroups(keys).some((g) => g.provider === remembered.provider && g.models.some((m) => m.id === remembered.model))
  ) {
    return { provider: remembered.provider, model: remembered.model };
  }
  const fallback = keys.find((k) => k.isDefault) ?? keys[0];
  return fallback ? { provider: fallback.provider, model: fallback.model } : null;
}
