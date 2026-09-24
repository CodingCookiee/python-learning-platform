---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Landing page (app/page.tsx)

Scope: public landing at `/` (signed-in users redirect to /dashboard). Visitor mode: **Persuade**.
It's the first surface of the new pylearn world. The app shell, auth, dashboard, modules, lesson and exercise surfaces inherit it.

Audience and job: a working developer (usually a JS/TS dev) deciding whether pylearn is how they'll get properly good at Python and then AI automation. The primary action is to start at white belt (sign up). The secondary action is to read the syllabus.

Proof on hand: real module and lesson counts plus titles from the DB, a JS ⟷ Python bridge example, a live in-browser Python drill (Pyodide), and 41 real achievements. Absent: users, testimonials, reviews, companies. Never fabricate these.

Constraints: light and dark themes both first-class. Respect prefers-reduced-motion. The AI track is planned, not built, so present its dan ranks as "in preparation". Gradings and spaced review ship in M1–M2, so the page must not go public before then.

## Direction contract

THESIS: Python as a discipline you're graded in. Ranks are earned by passing drills and gradings: the Python track counts kyu down to black belt, and AI automation continues in dan ranks. This refuses the dark code-editor hero with a feature-card grid.

OWN-WORLD: balanced color, soft but alive. The user rejected loud red and later dull grey or slate. Green-tinted cotton ground (never cream) and deep green ink. One jade accent serves as the single action color and the examiner's seal ink. A straw-yellow highlight is used sparingly for what is earned or current: the you-are-here or stripe-earned tag, the freshly taped stripe, and the dan bars. Belt dyes (off-white, straw, leaf, denim, cocoa, charcoal) are used only as rank data. Square-cut cloth and printed-syllabus geometry: 2–4px corners, keylined belt bands with tape stripes. Archivo at condensed width for rank numerals and labels, Archivo normal for text, and JetBrains Mono on a 24px line grid for code. In dark mode the ground becomes forest-green night cloth and the dyes stay soft.

STORY: The visitor sees that rank here means ability, tries a real drill without signing up, watches the stripe get taped on, reads the syllabus of belts built from the real modules, and ties on the white belt.

FIRST VIEWPORT: The headline "Earn your black belt in Python." is set large at the left, with a short subline and a jade "Start at white belt" button. On the right, a live drill panel: a task, an editable mono cell grid, and "Submit drill", graded in the browser. A full-width belt ladder band anchors the bottom edge with a straw "You start here" tag tied onto the white belt. Passing the drill tapes a stripe onto the white belt segment and stamps the jade seal, and the tag turns to "Stripe earned".

FORM: The Grading Syllabus, candidate 3 of 7 on the grounded list. Seed key dfa4bd61. Raises: one governing belt band (from crease), a monospace cell grid (from ASCII), confidence as stripe weight (from detector), monumental rank numerals (from mecha), and a belt-knot mark that drives the accent (from generative). Signature interaction: tape-on stripe plus seal stamp.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
