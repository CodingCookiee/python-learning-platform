/**
 * Limits on a capstone handed in as files. Browser-safe: the submit form checks them before sending,
 * and the submit route checks them again on what actually arrived.
 *
 * Files travel as base64 inside JSON, about 4/3 of their size, and Vercel refuses a request body over
 * 4.5 MB before the route ever runs. 3 MB of files is about 4 MB on the wire, which leaves room.
 */
export const MAX_FILE_BYTES = 1_000_000;
export const MAX_TOTAL_BYTES = 3_000_000;
export const MAX_FILES = 60;

export const TOO_BIG_TOTAL = "Uploads are limited to 3 MB in total. For a bigger project, link its GitHub repo instead.";
export const TOO_BIG_FILE = "Each file must be under 1 MB. For a bigger project, link its GitHub repo instead.";
export const TOO_MANY_FILES = `Upload at most ${MAX_FILES} files. For a bigger project, link its GitHub repo instead.`;

/**
 * The kinds of file a capstone is handed in as: source, text and config, or a zip of them. The examiner
 * downloads them, so nothing that runs when opened (an .exe, a script for the shell, an Office macro)
 */
export const ACCEPTED_EXTENSIONS = [".py", ".md", ".txt", ".zip", ".json", ".toml", ".cfg", ".ini"];

export function isAcceptedName(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function wrongType(name: string): string {
  return `“${name}” can't be handed in. Upload ${ACCEPTED_EXTENSIONS.join(", ")} files, or link a GitHub repo instead.`;
}

/** The size of the bytes a base64 string decodes to, worked out from its length (no decoding) */
export function base64Bytes(content: string): number {
  const padding = content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((content.length * 3) / 4) - padding);
}

/** What's wrong with a set of files to hand in, by their names and content, or null when they fit */
export function uploadProblem(files: { name: string; content: string }[]): string | null {
  if (files.length > MAX_FILES) return TOO_MANY_FILES;
  let total = 0;
  for (const file of files) {
    if (!isAcceptedName(file.name)) return wrongType(file.name);
    const bytes = base64Bytes(file.content);
    if (bytes > MAX_FILE_BYTES) return TOO_BIG_FILE;
    total += bytes;
  }
  return total > MAX_TOTAL_BYTES ? TOO_BIG_TOTAL : null;
}
