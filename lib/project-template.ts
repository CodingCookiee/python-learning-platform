/**
 * Where to download a capstone's starter file. Capstones from content/ store the
 * starter's source code; it's served by GET /api/projects/[id]/starter.
 */
export function starterTemplateHref(projectId: string, starterTemplate: string | null | undefined): string | null {
  if (!starterTemplate) return null;
  if (starterTemplate.startsWith("/") || starterTemplate.startsWith("http")) return starterTemplate;
  return `/api/projects/${projectId}/starter`;
}
