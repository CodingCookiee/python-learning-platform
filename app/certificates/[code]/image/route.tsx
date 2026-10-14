import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getCertificateForViewer } from "@/lib/certificates";
import { CERTIFICATE, formatIssued, normaliseCode } from "@/lib/certificate-rules";
import { publicOrigin } from "@/lib/public-origin";

/**
 * GET /certificates/[code]/image
 * The certificate as a PNG, for share previews (the page's og:image) and the holder's image
 * download: the page's design (components/certificates/certificate-sheet.tsx) at 1600 × 1131, A4's
 * proportions. Always paper. A withdrawn or unknown certificate is a 404, like its page.
 */

const W = 1600;
const H = 1131;
/** One container unit of the page's design, at this width */
const u = (n: number) => Math.round(n * (W / 100) * 10) / 10;

// The paper tokens (globals.css .paper), in hex for the renderer
const SHEET = "#f9fdf9";
const INK = "#162c21";
const MUTED = "#455c4f";
const KEYLINE = "#374e42";
const RULE = "rgba(55, 78, 66, 0.25)";
const STITCH = "rgba(55, 78, 66, 0.5)";
const SEAL = "#0f7c55";
const SEAL_INK = "#137350";
const STRAW = "#f0d777";
const BELT_BLACK = "#203329";

const KNOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g fill="${BELT_BLACK}" stroke="${KEYLINE}" stroke-width="1.25" stroke-linejoin="miter">
    <rect x="1.5" y="8.5" width="29" height="6"/>
    <path d="M13.6 15.5 L17.4 15.5 L12.2 28.6 L8.4 27.4 Z"/>
    <path d="M14.6 15.5 L18.4 15.5 L23.6 27.4 L19.8 28.6 Z"/>
    <rect x="11.5" y="5.5" width="9" height="11"/>
  </g>
  <path d="M11.5 8.2 L20.5 13.8" stroke="${KEYLINE}" stroke-width="1.25" fill="none"/>
</svg>`;

// Archivo (and JetBrains Mono for the ID), as the page sets them: the TrueType files in assets/fonts
// (SIL Open Font License), read once per server. Bundled rather than fetched, so the image never
// depends on reaching Google Fonts; next.config.ts traces them into this route. If one can't be read,
// the renderer's own font stands in.
type FontSpec = { name: string; weight: 400 | 700 | 800; file: string };
const FONTS: FontSpec[] = [
  { name: "Archivo Condensed", weight: 800, file: "archivo-condensed-800.ttf" },
  { name: "Archivo SemiCondensed", weight: 700, file: "archivo-semicondensed-700.ttf" },
  { name: "Archivo", weight: 400, file: "archivo-400.ttf" },
  { name: "JetBrains Mono", weight: 400, file: "jetbrains-mono-400.ttf" },
];
let fontsLoading: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" }>> | null = null;

async function loadFont(spec: FontSpec) {
  const data = await readFile(join(process.cwd(), "assets/fonts", spec.file));
  return { name: spec.name, data, weight: spec.weight, style: "normal" as const };
}

function fonts() {
  fontsLoading ??= Promise.allSettled(FONTS.map(loadFont)).then((results) => {
    const loaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (loaded.length < FONTS.length) {
      console.error("Certificate image: a font in assets/fonts couldn't be read", results);
      // Try again on a later request
      fontsLoading = null;
    }
    return loaded;
  });
  return fontsLoading;
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normaliseCode((await params).code);
  const found = code ? await getCertificateForViewer(code, null) : null;
  if (!found) return new Response("No certificate here", { status: 404 });
  const c = found.certificate;
  const words = CERTIFICATE[c.track];
  const url = `${publicOrigin()}/certificates/${c.code}`;
  const nameSize = c.name.length <= 24 ? u(5.4) : c.name.length <= 44 ? u(4.3) : u(3.3);
  const loaded = await fonts();
  const has = (name: string) => loaded.some((f) => f.name === name);
  const condensed = has("Archivo Condensed") ? "Archivo Condensed" : undefined;

  return new ImageResponse(
    (
      // A hair of letter spacing turns off the renderer's kerning, which otherwise opens a wide gap after
      // some commas ("review,  and"); the headings set their own
      <div style={{ width: "100%", height: "100%", display: "flex", background: SHEET, color: INK, letterSpacing: 0.01, fontFamily: has("Archivo") ? "Archivo" : undefined }}>
        <div style={{ display: "flex", flex: 1, border: `${u(0.28)}px solid ${KEYLINE}`, padding: u(1.5) }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              border: `${u(0.14)}px dashed ${STITCH}`,
              padding: `${u(3.2)}px ${u(4.4)}px`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: u(1.3), borderBottom: `1px solid ${RULE}`, paddingBottom: u(2.2) }}>
              <div style={{ display: "flex", alignItems: "center", gap: u(0.8) }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
                <img src={`data:image/svg+xml;utf8,${encodeURIComponent(KNOT)}`} width={u(3)} height={u(3)} alt="" />
                <span style={{ fontSize: u(2.1), fontWeight: 700, letterSpacing: -1, fontFamily: has("Archivo SemiCondensed") ? "Archivo SemiCondensed" : undefined }}>
                  pylearn
                </span>
              </div>
              <span style={{ fontSize: u(4.2), fontWeight: 800, lineHeight: 0.95, letterSpacing: -1.3, fontFamily: condensed }}>{words.title}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: u(5) }}>
              <div style={{ display: "flex", flexDirection: "column", gap: u(1.6), width: "29%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    height: u(3.2),
                    background: BELT_BLACK,
                    border: `${u(0.14)}px solid ${KEYLINE}`,
                  }}
                >
                  {c.track === "automation" && (
                    <div style={{ display: "flex", gap: u(0.36), background: SEAL, padding: `${u(0.5)}px ${u(0.6)}px` }}>
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} style={{ width: u(0.42), background: STRAW }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", fontFamily: condensed, lineHeight: 0.8 }}>
                  <span style={{ fontSize: u(11.5), fontWeight: 800, letterSpacing: -8 }}>{words.rank.numeral}</span>
                  <span style={{ fontSize: u(3.6), fontWeight: 800, marginLeft: u(0.9) }}>{words.rank.suffix}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: u(1.1), flex: 1 }}>
                <span style={{ fontSize: u(1.6), color: MUTED }}>This certifies that</span>
                <span style={{ fontSize: nameSize, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1, fontFamily: condensed }}>{c.name}</span>
                <span style={{ fontSize: u(1.65), lineHeight: 1.45, maxWidth: u(44) }}>{words.statement}.</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderTop: `1px solid ${RULE}`, paddingTop: u(2) }}>
              <div style={{ display: "flex", flexDirection: "column", gap: u(0.45), fontSize: u(1.3) }}>
                <span>Awarded by pylearn on {formatIssued(c.issuedAt)}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: u(0.5) }}>
                  <span style={{ color: MUTED }}>ID</span>
                  <span style={{ fontFamily: has("JetBrains Mono") ? "JetBrains Mono" : undefined }}>{c.code}</span>
                </div>
                <span style={{ color: MUTED, fontFamily: has("JetBrains Mono") ? "JetBrains Mono" : undefined }}>{url}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  transform: "rotate(-7deg)",
                  border: `${u(0.32)}px solid ${SEAL}`,
                  padding: u(0.3),
                  marginRight: u(0.6),
                  marginBottom: u(0.4),
                  color: SEAL_INK,
                  fontFamily: condensed,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    border: `${u(0.12)}px solid ${SEAL}`,
                    padding: `${u(0.8)}px ${u(1.5)}px`,
                  }}
                >
                  <span style={{ fontSize: u(2.4), fontWeight: 800, letterSpacing: 2.3, lineHeight: 1 }}>CERTIFIED</span>
                  <span style={{ fontSize: u(1.05), fontWeight: 800, letterSpacing: 1.3, lineHeight: 1, marginTop: u(0.5) }}>
                    {words.seal.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: loaded,
      // The name on it can change (the holder's fix): previews refetch within the hour
      headers: { "cache-control": "public, max-age=3600" },
    }
  );
}
