function normalizeListItem(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || /^#+\s+/.test(trimmed)) {
    return "";
  }

  return trimmed
    .replace(/^[-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function parseProjectListText(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (typeof input !== "string") {
    return [];
  }

  const trimmed = input.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
    }
    if (typeof parsed === "string") {
      return parseProjectListText(parsed);
    }
  } catch {
    // fall through to plain text parsing
  }

  const lines = trimmed
    .split(/\r?\n+/)
    .map((line) => normalizeListItem(line))
    .filter((line) => line.length > 0);

  if (lines.length > 1) {
    return lines;
  }

  const bulletMatches = trimmed
    .split(/\n(?=[-*] |\d+[.)] )/g)
    .map((part) => normalizeListItem(part))
    .filter((part) => part.length > 0);

  if (bulletMatches.length > 1) {
    return bulletMatches;
  }

  const sentenceMatches = splitIntoSentences(normalizeListItem(trimmed));
  if (sentenceMatches.length > 1) {
    return sentenceMatches;
  }

  return [trimmed];
}
