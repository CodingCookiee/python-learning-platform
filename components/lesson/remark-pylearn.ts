/**
 * Remark plugin for pylearn lesson markdown (docs/CONTENT.md):
 * - `> [!JS]`, `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]` blockquotes become callouts
 *   (the marker is removed; the kind goes to a data-callout attribute).
 * - A fenced code block's info string after the language (```python norun) is kept
 *   as a data-meta attribute, so the renderer can honour norun / raises.
 */

type MdNode = {
  type: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
};

const CALLOUT = /^\[!(JS|NOTE|WARNING|TIP)\][ \t]*\n?/i;

function tagCallout(node: MdNode) {
  const first = node.children?.[0];
  const text = first?.type === "paragraph" ? first.children?.[0] : undefined;
  if (!text || text.type !== "text" || typeof text.value !== "string") return;
  const match = CALLOUT.exec(text.value);
  if (!match) return;
  text.value = text.value.slice(match[0].length);
  node.data = { ...node.data, hProperties: { ...node.data?.hProperties, "data-callout": match[1]!.toLowerCase() } };
}

function walk(node: MdNode) {
  if (node.type === "blockquote") tagCallout(node);
  if (node.type === "code" && node.meta) {
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, "data-meta": node.meta } };
  }
  node.children?.forEach(walk);
}

export default function remarkPylearn() {
  return (tree: MdNode) => walk(tree);
}
