import { describe, expect, it } from "vitest";
import { choiceSchema, modelGroups, modelName, resolveChoice, type SavedKey } from "@/lib/ai/models";
import { MODEL_SUGGESTIONS } from "@/lib/ai/gateway";

const anthropic: SavedKey = { provider: "anthropic", model: "claude-sonnet-5-5", isDefault: true };
const openai: SavedKey = { provider: "openai", model: "gpt-5-mini", isDefault: false };
const gemini: SavedKey = { provider: "gemini", model: "gemini-exp-1206", isDefault: false };

describe("the model switcher's choices", () => {
  it("offers nothing without a key", () => {
    expect(modelGroups([])).toEqual([]);
    expect(resolveChoice([], { provider: "anthropic", model: "claude-opus-5-5" })).toBeNull();
  });

  it("offers every suggested model of a provider with one key", () => {
    const groups = modelGroups([anthropic]);
    expect(groups.map((g) => g.provider)).toEqual(["anthropic"]);
    expect(groups[0]!.models.map((m) => m.id)).toEqual(MODEL_SUGGESTIONS.anthropic.map((m) => m.id));
  });

  it("groups three keys in the providers' order, with a model typed in Settings first in its group", () => {
    const groups = modelGroups([gemini, openai, anthropic]);
    expect(groups.map((g) => g.provider)).toEqual(["anthropic", "openai", "gemini"]);
    expect(groups[2]!.models[0]).toEqual({ id: "gemini-exp-1206", name: "gemini-exp-1206" });
  });

  it("uses the remembered model while it's offered, else the default key's", () => {
    const keys = [anthropic, openai];
    expect(resolveChoice(keys, { provider: "openai", model: "gpt-5" })).toEqual({ provider: "openai", model: "gpt-5" });
    // Its key was removed
    expect(resolveChoice(keys, { provider: "gemini", model: "gemini-3.8-flash" })).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
    });
    // A model no longer offered (it was typed, then changed in Settings)
    expect(resolveChoice(keys, { provider: "openai", model: "gpt-4o" })).toEqual({ provider: "anthropic", model: "claude-sonnet-5-5" });
    expect(resolveChoice(keys, null)).toEqual({ provider: "anthropic", model: "claude-sonnet-5-5" });
  });

  it("falls back to the first key if none is marked the default", () => {
    expect(resolveChoice([{ ...openai }], null)).toEqual({ provider: "openai", model: "gpt-5-mini" });
  });

  it("names suggested models, and shows a typed one by its id", () => {
    expect(modelName("anthropic", "claude-haiku-5-5")).toBe("Claude Haiku 5.5");
    expect(modelName("gemini", "gemini-exp-1206")).toBe("gemini-exp-1206");
  });

  it("accepts a well-formed choice, or none, and nothing else", () => {
    expect(choiceSchema.safeParse(undefined).success).toBe(true);
    expect(choiceSchema.safeParse({ provider: "openai", model: "gpt-5" }).success).toBe(true);
    expect(choiceSchema.safeParse({ provider: "mistral", model: "large" }).success).toBe(false);
    expect(choiceSchema.safeParse({ provider: "openai", model: "gpt 5?key=x" }).success).toBe(false);
    expect(choiceSchema.safeParse({ provider: "openai", model: "" }).success).toBe(false);
  });
});
