/**
 * The one place the platform talks to model providers. Provider-neutral: callers
 * pass a system prompt and user/assistant turns and get text and token usage back,
 * whichever provider the learner's key is for. Plain fetch, no SDKs.
 */

export const PROVIDERS = ["anthropic", "openai"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

/** Suggested models per provider; the learner can type any model their key can use */
export const MODEL_SUGGESTIONS: Record<Provider, string[]> = {
  anthropic: ["claude-opus-5-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"],
  openai: ["gpt-5", "gpt-5-mini"],
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-5-mini",
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

export async function complete(req: CompleteRequest): Promise<CompleteResult> {
  return req.provider === "anthropic" ? anthropic(req) : openai(req);
}
