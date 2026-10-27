
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  // Control characters (a tab or newline can make a browser read "/\t/evil.example" as a host)
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  // Sign-in and sign-up themselves would only loop
  if (/^\/auth(\/|$)/.test(value)) return null;
  return value;
}
