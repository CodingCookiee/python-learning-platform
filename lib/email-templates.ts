/**
 * The app's transactional emails, in the pylearn look: the belt ladder as the
 * header rule, a condensed Archivo heading, the jade button, and the straw
 * highlight for the one detail that matters (how long the link lasts).
 *
 * Email clients don't run the app's CSS, so this is tables and inline styles,
 * with hex values converted from the OKLCH tokens in app/globals.css. Clients
 * that support it get the dark theme too; Archivo loads where web fonts are
 * allowed (Apple Mail, iOS) and falls back to a narrow system face elsewhere.
 */

// app/globals.css :root, as hex
const L = {
  ground: "#f1f8f1",
  sheet: "#f9fdf9",
  ink: "#162c21",
  muted: "#455c4f",
  border: "#cddace",
  primary: "#0f7c55",
  onPrimary: "#f6fcf6",
  highlight: "#f0d777",
  onHighlight: "#45310b",
  keyline: "#374e42",
};
// app/globals.css .dark
const D = {
  ground: "#0c1b14",
  sheet: "#13231c",
  ink: "#e7f0e6",
  muted: "#a5bba9",
  border: "#2c4037",
  primary: "#78d59d",
  onPrimary: "#082016",
};
// The belt dyes, white to black: the syllabus in one line
const BELTS = ["#fdfcf6", "#f0d680", "#7cb57d", "#6099c1", "#946e50", "#203329"];

const SANS = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CONDENSED = "Archivo, 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface Layout {
  subject: string;
  /** The inbox preview line */
  preheader: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  action: { label: string; href: string };
  /** Shown in the straw highlight under the button */
  note: string;
  /** Small print: why they got this */
  footnote: string;
}

function beltRule(): string {
  const cells = BELTS.map(
    (c, i) =>
      `<td class="belt" width="16.66%" height="6" style="height:6px;line-height:6px;font-size:0;background:${c};${
        i === 0 ? `border-left:1px solid ${L.keyline};` : ""
      }border-top:1px solid ${L.keyline};border-bottom:1px solid ${L.keyline};${i === BELTS.length - 1 ? `border-right:1px solid ${L.keyline};` : ""}">&nbsp;</td>`
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${cells}</tr></table>`;
}

function render(e: Layout): EmailContent {
  const href = escape(e.action.href);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(e.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; }
  a { color: ${L.primary}; }
  .heading { font-variation-settings: "wdth" 72; }
  @media (prefers-color-scheme: dark) {
    .ground { background: ${D.ground} !important; }
    .sheet { background: ${D.sheet} !important; border-color: ${D.border} !important; }
    .ink { color: ${D.ink} !important; }
    .muted { color: ${D.muted} !important; }
    .eyebrow, .link { color: ${D.primary} !important; }
    .button { background: ${D.primary} !important; }
    .button a { color: ${D.onPrimary} !important; }
    .rule { border-color: ${D.border} !important; }
  }
  @media (max-width: 520px) {
    .pad { padding: 28px 22px !important; }
    .heading { font-size: 30px !important; }
  }
</style>
</head>
<body class="ground" style="margin:0;padding:0;background:${L.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escape(e.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" class="ground" width="100%" cellpadding="0" cellspacing="0" style="background:${L.ground};">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 0 14px 2px;font-family:${SANS};font-size:19px;font-weight:800;letter-spacing:-0.01em;" class="ink">
        <span class="ink" style="color:${L.ink};">pylearn</span>
      </td></tr>
      <tr><td>${beltRule()}</td></tr>
      <tr><td class="sheet pad" style="background:${L.sheet};border:1px solid ${L.border};border-top:0;padding:36px 36px 32px;">
        <p class="eyebrow" style="margin:0 0 10px;font-family:${SANS};font-size:13px;font-weight:600;color:${L.primary};">${escape(e.eyebrow)}</p>
        <h1 class="heading ink" style="margin:0 0 18px;font-family:${CONDENSED};font-stretch:condensed;font-size:36px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${L.ink};">${escape(e.heading)}</h1>
        ${e.paragraphs
          .map(
            (p) =>
              `<p class="ink" style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${L.ink};">${escape(p)}</p>`
          )
          .join("\n        ")}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 18px;">
          <tr><td class="button" style="background:${L.primary};border-radius:4px;">
            <a href="${href}" style="display:inline-block;padding:14px 22px;font-family:${SANS};font-size:16px;font-weight:600;color:${L.onPrimary};text-decoration:none;border-radius:4px;">${escape(e.action.label)} &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:0 0 28px;"><span style="display:inline-block;background:${L.highlight};color:${L.onHighlight};font-family:${SANS};font-size:13px;font-weight:600;padding:3px 8px;border-radius:2px;">${escape(e.note)}</span></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="rule" style="border-top:1px solid ${L.border};padding-top:18px;">
          <p class="muted" style="margin:0 0 6px;font-family:${SANS};font-size:13px;line-height:1.5;color:${L.muted};">Button not working? Paste this link into your browser:</p>
          <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.5;word-break:break-all;"><a class="link" href="${href}" style="color:${L.primary};">${href}</a></p>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:20px 2px 0;">
        <p class="muted" style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.5;color:${L.muted};">${escape(e.footnote)}</p>
        <p class="muted" style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${L.muted};">pylearn · Python from first syntax to advanced, then AI automation.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    e.heading,
    "",
    ...e.paragraphs.flatMap((p) => [p, ""]),
    `${e.action.label}: ${e.action.href}`,
    "",
    e.note,
    "",
    e.footnote,
    "",
    "pylearn · Python from first syntax to advanced, then AI automation.",
  ].join("\n");
  return { subject: e.subject, html, text };
}

export function verificationEmail(href: string): EmailContent {
  return render({
    subject: "Confirm your pylearn email",
    preheader: "One click and your white belt is ready.",
    eyebrow: "Before your first lesson",
    heading: "Confirm your email",
    paragraphs: [
      "Thanks for signing up. Confirm this address and your account opens at white belt, 16 kyu, ready for module 1.",
    ],
    action: { label: "Confirm my email", href },
    note: "The link works for 24 hours",
    footnote: "You're getting this because someone signed up for pylearn with this address. If it wasn't you, ignore this email and nothing happens.",
  });
}

export function passwordResetEmail(href: string): EmailContent {
  return render({
    subject: "Reset your pylearn password",
    preheader: "Choose a new password. Your belt and streak stay as they are.",
    eyebrow: "Your account",
    heading: "Reset your password",
    paragraphs: [
      "Someone, hopefully you, asked to reset the password for this pylearn account. Choose a new one and you're back on the mat. Your belt, stripes and streak stay as they are.",
    ],
    action: { label: "Choose a new password", href },
    note: "The link works once, for one hour",
    footnote: "If you didn't ask for this, ignore this email. Your password hasn't changed.",
  });
}
