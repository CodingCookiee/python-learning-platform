/**
 * The one place the platform talks to model providers. Provider-neutral: callers
 * pass a system prompt and user/assistant turns and get text and token usage back,
 * whichever provider the learner's key is for (Anthropic, OpenAI or Gemini). Plain fetch, no SDKs.
 */

export const PROVIDERS = ["anthropic", "openai", "gemini"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

export interface ModelSuggestion {
  id: string;
  name: string;
  note: string;
}

/** Suggested models per provider, most capable first; the learner can type any model their key can use */
export const MODEL_SUGGESTIONS: Record<Provider, ModelSuggestion[]> = {
  anthropic: [
    { id: "claude-opus-5-5", name: "Claude Opus 5.5", note: "The most capable. Costs the most per call." },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", note: "Strong and quicker, for less." },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", note: "The fastest and cheapest." },
  ],
  openai: [
    { id: "gpt-5", name: "GPT-5", note: "The most capable. Costs the most per call." },
    { id: "gpt-5-mini", name: "GPT-5 mini", note: "Quicker and cheaper." },
  ],
  gemini: [
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", note: "Google's most capable Flash model. Has a free tier." },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", note: "Quicker and cheaper. Has a free tier." },
  ],
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-5-mini",
  gemini: "gemini-3.8-flash",
};

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CompleteRequest {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
  timeoutMs?: number;
}

export interface CompleteResult {
  text: string;
  usage: { input: number; output: number; cached: number };
  /** True when the model ran out of tokens mid-reply */
  truncated: boolean;
}

export type AiErrorCode = "auth" | "rate_limit" | "bad_request" | "provider" | "timeout" | "network";

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "AiError";
  }
}

function classify(status: number, message: string): AiError {
  if (status === 401 || status === 403) return new AiError("auth", "The provider rejected the API key.", status);
  if (status === 429) return new AiError("rate_limit", "The provider is rate limiting this key. Try again shortly.", status);
  if (status === 400 || status === 404 || status === 422) return new AiError("bad_request", message, status);
  return new AiError("provider", `The provider had a problem (${status}). Try again shortly.`, status);
}

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new AiError("timeout", "The model took too long to answer.");
    }
    throw new AiError("network", "Couldn't reach the provider.");
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = (data?.error ?? {}) as { message?: string };
    throw classify(res.status, typeof err.message === "string" ? err.message : `HTTP ${res.status}`);
  }
  return data ?? {};
}

async function anthropic(req: CompleteRequest): Promise<CompleteResult> {
  const data = (await post(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": req.apiKey, "anthropic-version": "2023-06-01" },
    {
      model: req.model,
      max_tokens: req.maxTokens,
      // The drill context is the same across a conversation, so cache it
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: req.messages,
    },
    req.timeoutMs ?? 60_000
  )) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  };
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const u = data.usage ?? {};
  return {
    text,
    usage: {
      input: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
      output: u.output_tokens ?? 0,
      cached: u.cache_read_input_tokens ?? 0,
    },
    truncated: data.stop_reason === "max_tokens",
  };
}

async function openai(req: CompleteRequest): Promise<CompleteResult> {
  const data = (await post(
    "https://api.openai.com/v1/chat/completions",
    { authorization: `Bearer ${req.apiKey}` },
    {
      model: req.model,
      // Reasoning models spend part of this on thinking, so leave them room
      max_completion_tokens: req.maxTokens * 3,
      messages: [{ role: "system", content: req.system }, ...req.messages],
    },
    req.timeoutMs ?? 90_000
  )) as {
    choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
  };
  const choice = data.choices?.[0];
  const u = data.usage ?? {};
  return {
    text: choice?.message?.content ?? "",
    usage: { input: u.prompt_tokens ?? 0, output: u.completion_tokens ?? 0, cached: u.prompt_tokens_details?.cached_tokens ?? 0 },
    truncated: choice?.finish_reason === "length",
  };
}

async function gemini(req: CompleteRequest): Promise<CompleteResult> {
  const model = encodeURIComponent(req.model.replace(/^models\//, ""));
  let data: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number };
  };
  try {
    data = (await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      // In a header rather than ?key=, so the key never ends up in a logged URL
      { "x-goog-api-key": req.apiKey },
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        // Thinking models spend part of this on thinking, so leave them room
        generationConfig: { maxOutputTokens: req.maxTokens * 3 },
      },
      req.timeoutMs ?? 90_000
    )) as typeof data;
  } catch (e) {
    // Google answers a bad key with 400 INVALID_ARGUMENT ("API key not valid") rather than 401
    if (e instanceof AiError && e.code === "bad_request" && /api key/i.test(e.message)) {
      throw new AiError("auth", "The provider rejected the API key.", e.status);
    }
    throw e;
  }
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  const reason = data.promptFeedback?.blockReason ?? candidate?.finishReason;
  if (!text && reason && reason !== "STOP" && reason !== "MAX_TOKENS") {
    throw new AiError("provider", `Gemini didn't answer (${reason}). Try rephrasing, or try again.`);
  }
  const u = data.usageMetadata ?? {};
  return {
    text,
    usage: {
      input: u.promptTokenCount ?? 0,
      // Thinking is billed as output
      output: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
      cached: u.cachedContentTokenCount ?? 0,
    },
    truncated: candidate?.finishReason === "MAX_TOKENS",
  };
}

const PROVIDER_CALL: Record<Provider, (req: CompleteRequest) => Promise<CompleteResult>> = { anthropic, openai, gemini };

export async function complete(req: CompleteRequest): Promise<CompleteResult> {
  return PROVIDER_CALL[req.provider](req);
}
