---
name: pylearn
description: A graded path from first Python syntax to black belt, then AI automation, set as a printed grading syllabus in jade and straw.
colors:
  primary: "oklch(0.52 0.11 162)"
  primary-foreground: "oklch(0.985 0.01 145)"
  seal: "oklch(0.52 0.11 162)"
  ring: "oklch(0.56 0.11 162)"
  success: "oklch(0.52 0.11 150)"
  highlight: "oklch(0.88 0.12 95)"
  highlight-foreground: "oklch(0.33 0.06 80)"
  background: "oklch(0.972 0.012 145)"
  sheet: "oklch(0.99 0.006 145)"
  foreground: "oklch(0.27 0.035 162)"
  secondary: "oklch(0.935 0.02 145)"
  muted: "oklch(0.94 0.016 145)"
  muted-foreground: "oklch(0.45 0.035 160)"
  accent: "oklch(0.925 0.035 150)"
  border: "oklch(0.875 0.022 148)"
  input: "oklch(0.8 0.03 150)"
  keyline: "oklch(0.4 0.035 162)"
  destructive: "oklch(0.54 0.13 30)"
  belt-white: "oklch(0.99 0.008 100)"
  belt-yellow: "oklch(0.88 0.11 93)"
  belt-green: "oklch(0.72 0.1 145)"
  belt-blue: "oklch(0.66 0.085 240)"
  belt-brown: "oklch(0.57 0.065 60)"
  belt-black: "oklch(0.3 0.03 162)"
  tape: "oklch(0.985 0.008 100)"
  code-keyword: "oklch(0.45 0.1 165)"
  code-string: "oklch(0.5 0.1 100)"
  code-number: "oklch(0.52 0.11 45)"
  code-attr: "oklch(0.47 0.08 245)"
  night-background: "oklch(0.205 0.024 165)"
  night-sheet: "oklch(0.24 0.026 165)"
  night-foreground: "oklch(0.945 0.016 140)"
  night-muted-foreground: "oklch(0.77 0.035 150)"
  night-primary: "oklch(0.8 0.12 156)"
  night-primary-foreground: "oklch(0.22 0.035 165)"
  night-highlight: "oklch(0.86 0.12 95)"
  night-highlight-foreground: "oklch(0.26 0.045 80)"
  night-accent: "oklch(0.31 0.04 162)"
  night-border: "oklch(0.35 0.03 165)"
  night-input: "oklch(0.44 0.035 165)"
  night-keyline: "oklch(0.63 0.04 155)"
  night-destructive: "oklch(0.76 0.11 30)"
  night-belt-black: "oklch(0.14 0.02 165)"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7.2vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.025em"
    fontVariation: "\"wdth\" 72"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "\"wdth\" 72"
  rank-numeral:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "6.5rem"
    fontWeight: 800
    lineHeight: 0.78
    letterSpacing: "-0.035em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 72"
  numeral:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 72"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    fontVariation: "\"wdth\" 72"
  title-plain:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  reading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.75
    fontFeature: "\"kern\", \"liga\""
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"kern\", \"liga\""
  body-small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  control:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "normal"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 72"
  wordmark:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "\"wdth\" 86"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5rem
    fontFeature: "\"liga\" 0, \"calt\" 0"
rounded:
  none: "0px"
  sm: "2px"
  md: "3px"
spacing:
  gutter-sm: "16px"
  gutter-md: "24px"
  gutter-lg: "32px"
  panel-x: "20px"
  card: "24px"
  card-sm: "16px"
  block: "56px"
  column-gap: "64px"
  section: "80px"
  section-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, oklch(0.52 0.11 162), oklch(0.27 0.035 162) 18%)"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "0 28px"
    height: "48px"
  button-primary-sm:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.accent}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    size: "40px"
  button-outline-hover:
    backgroundColor: "{colors.accent}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-small}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "40px"
  badge:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  here-tag:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.highlight-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  sheet-panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "{spacing.card}"
  belt-band:
    backgroundColor: "{colors.belt-white}"
    rounded: "{rounded.none}"
    height: "24px"
  seal:
    backgroundColor: "transparent"
    textColor: "{colors.seal}"
    rounded: "{rounded.none}"
    padding: "3px"
---

# Design System: pylearn

## Overview

**Creative North Star: "The Grading Syllabus"**

pylearn is set like the printed syllabus of a martial-arts school, rendered in jade and straw. Python is a discipline you are graded in: the Python track counts kyu down from white belt to black belt, and AI automation continues in dan ranks. Every visual device serves that idea. Belts are woven cloth (stitch rows, a keyline edge, a rank bar at the tail). Passed work gets a tilted, square examiner's seal. Progress is tape stripes pressed onto a belt. Content is ruled into syllabus rows, not boxed into cards.

The palette is balanced: soft enough to live with for a 90-minute evening session, with enough colour to feel alive. The ground is green-tinted cotton and the ink is deep forest green. One jade accent carries every action and the seal. A straw-yellow highlight appears only where the learner stands or has just earned something. Belt dyes are rank data and nothing else. In dark mode the ground becomes forest-green cloth in an evening training hall. The jade lightens to stay legible and the dyes stay soft. Loud, saturated accents (red in particular) and flat grey or slate were both tried and rejected by the owner. That rejection is part of the system.

Density is that of a well-set reference document. There are large condensed headings and generous section bands (80 to 112px), and inside them compact ruled rows with tabular meta. The surface is flat. Depth comes from two tones of cloth (ground and sheet) and hairlines, never from shadow.

**Key Characteristics:**
- One family, Archivo, used across its width axis: condensed for ranks and headings, normal for reading. JetBrains Mono is for code only.
- A jade accent is the single action colour. Straw marks position and the moment of earning.
- Belt dyes (white, yellow, green, blue, brown, black) appear only as rank data.
- Square-cut geometry with 0 to 3px corners, keylined belt bands, and a square seal.
- Flat cloth: tonal layering and hairline rules, with no drop shadows.
- Motion is reserved for earning: the tape-on stripe and the seal stamp.

## Colors

Every colour is expressed in OKLCH and is the normative source in `app/globals.css`. Every neutral carries a green tint (hue 140 to 165). Nothing is flat grey.

### Primary
- **Jade** (oklch(0.52 0.11 162)): the only action colour. It fills primary buttons, colours links, and sets the text caret, the selection background and, one step lighter as **Jade Ring** (oklch(0.56 0.11 162)), the focus outline. The default mark (the belt knot) is jade for signed-out visitors.
- **Seal Jade** (oklch(0.52 0.11 162)): the same ink as a separate semantic token for the examiner's seal and the black belt's rank bar. Keep the token separate so seal ink can be retuned without touching buttons.
- **Pass Green** (oklch(0.52 0.11 150)): check marks on passed test cases. It is a sibling of jade, so a pass reads as the same family as the seal.
- **Night Jade** (oklch(0.8 0.12 156)) on **Deep Forest** text (oklch(0.22 0.035 165)): the dark-mode accent. It lightens and turns slightly greener so the CTA stays the brightest mark on the night ground.

### Secondary
- **Straw** (oklch(0.88 0.12 95)) with **Straw Ink** text (oklch(0.33 0.06 80)): the highlight. It appears only as the "You start here" / "Stripe earned" tag on the learner's current belt, the freshly earned stripe as it tapes on, and the dashed dan-rank placeholder bars (straw at 80%). Night Straw (oklch(0.86 0.12 95)) with oklch(0.26 0.045 80) text is its dark twin.

### Tertiary (belt dyes, rank data only)
- **Belt White** (oklch(0.99 0.008 100)), **Belt Yellow** (oklch(0.88 0.11 93)), **Belt Green** (oklch(0.72 0.1 145)), **Belt Blue** (oklch(0.66 0.085 240)), **Belt Brown** (oklch(0.57 0.065 60)), **Belt Black** (oklch(0.3 0.03 162); night oklch(0.14 0.02 165)): the cloth of each rank. They fill belt bands, the ladder, auth-panel belt lists, and the knot mark in a signed-in learner's current belt.
- **Tape** (oklch(0.985 0.008 100)): an earned stripe on a rank bar.
- **Code tokens** (keyword oklch(0.45 0.1 165), string oklch(0.5 0.1 100), number oklch(0.52 0.11 45), attr oklch(0.47 0.08 245), each lifted in dark mode): highlight.js syntax colours. They are the palette's own hues, deepened for legibility. Comments use muted ink in italic.

### Neutral
- **Cotton Ground** (oklch(0.972 0.012 145)): the page background and the sticky header.
- **Sheet** (oklch(0.99 0.006 145)): the raised paper tone for alternating section bands, panels, cards, inputs and code blocks. Night Sheet is oklch(0.24 0.026 165) on the Forest Night ground (oklch(0.205 0.024 165)).
- **Forest Ink** (oklch(0.27 0.035 162)): all primary text. Night Ink is oklch(0.945 0.016 140).
- **Moss Grey-Green** (oklch(0.45 0.035 160)): secondary text, meta, line numbers and captions. Night is oklch(0.77 0.035 150).
- **Jade Wash** (oklch(0.925 0.035 150)): hover fills, the default badge, the highlighted "Pass the grading" step (70%) and the passed-drill strip (60%).
- **Hairline** (oklch(0.875 0.022 148)): every border and row rule. Rows inside a list use it at 70%.
- **Field Edge** (oklch(0.8 0.03 150)): input and outline-button borders.
- **Keyline** (oklch(0.4 0.035 162); night oklch(0.63 0.04 155)): belt edges, stitch rows (14% of keyline), step dividers (40%), and the knot's stroke.
- **Clay** (oklch(0.54 0.13 30); night oklch(0.76 0.11 30)): errors only. It is a muted earthen red, the highest-chroma colour in the system and still well under the rejected saturated red. It is used as text or a 30% border over an 8% wash, never as a fill.

### Named Rules
**The Jade Voice Rule.** Jade is the only colour that means "act". Primary buttons, links, the seal, focus and selection use it. No second action colour exists.

**The Straw Is Earned Rule.** Straw marks where the learner stands and what they just earned: the here-tag, the fresh stripe, and the dan bars still to come. It is never a button, a heading colour, a section band or decoration.

**The Dye Is Data Rule.** Belt dyes appear only where they encode rank. They are never category colours, chart series, difficulty labels or decorative fills.

**The Balanced Chroma Rule.** Accents sit near chroma 0.11 to 0.12, and no colour in the system exceeds 0.13. Every neutral keeps a green tint (chroma 0.006 or more). A new colour that is louder than jade, or greyer than the hairline, is off-system.

## Typography

**Display Font:** Archivo (variable, with the `wdth` axis), falling back to system-ui
**Body Font:** Archivo at normal width
**Label/Mono Font:** JetBrains Mono, falling back to ui-monospace

**Character:** A single grotesque stretched across its width axis. Condensed extrabold gives the monumental rank numerals and headlines the press of a printed grading certificate. Normal width keeps reading calm. JetBrains Mono sits on a strict 24px line grid wherever code appears.

### Hierarchy
- **Display** (800, clamp(3rem, 7.2vw, 6rem), 0.92, condensed): one per page, for the hero headline and the closing line ("Tie on the white belt.").
- **Headline** (800, 3rem below 640px, 3.75rem above, line-height 1, condensed): section headings ("The syllabus", "Rank is earned, not clicked."). The auth panel uses a 3.75rem condensed heading at 0.92.
- **Rank Numeral** (800, 6.5rem, 8rem from 640px, 0.78, -0.035em, tabular, condensed): the learner's own grade in the rank card ("15" beside "kyu"). One per page, and only for the learner's rank.
- **Numeral** (800, 2.25rem, tabular, condensed): rank numbers such as "16–14" and "1st", followed by a small 0.875rem semibold muted unit ("kyu", "dan"). The record figure scales it to 5.5rem at 0.8 line-height and -0.03em tracking.
- **Title** (700, 1.5rem, condensed): belt names in the syllabus.
- **Title Plain** (600, 1.125rem, -0.01em, normal width): step headings and card titles.
- **Lede** (400, 1.125rem, 1.625): section intros and hero subline, capped near 34 to 42rem (about 65ch).
- **Reading** (400, 1.0625rem, 1.75, 70ch measure): lesson prose and list items. Longer lines need the larger size and looser leading than interface body text.
- **Body** (400, 1rem, 1.5) and **Body Small** (400, 0.875rem, 1.625): running text and step descriptions.
- **Label** (600, 0.75rem, condensed, tabular, sentence case, normal tracking): meta lines, ladder ranges, drill header tags and module indices (0.875rem at 400 for indices and lesson counts).
- **Wordmark** (700, 1.3125rem, -0.03em, semicondensed `wdth` 86): "pylearn", always lowercase.
- **Mono** (400, 0.8125rem, 24px line): code, the drill editor, test cases and REPL snippets. Ligatures are off.

### Named Rules
**The One Family Rule.** Archivo carries everything except code. Width communicates role: condensed (`wdth` 72) for ranks, headings, belt names and meta; semicondensed (86) only for the wordmark; normal for reading. Don't add a second display face.

**The Sentence Case Rule.** Labels, meta, nav, form labels, menu items and dialog titles are sentence case at normal tracking. Letter-spaced uppercase belongs only to the stamped lettering inside the Seal (0.06em and 0.08em), because a stamp is the one object in this world that is lettered that way.

**The Tabular Count Rule.** Every number that counts (kyu, module index, lesson count, hours, line numbers, streak length) uses tabular figures.

## Layout

The container is 1280px (`max-w-7xl`) centred, with 16 / 24 / 32px gutters at phone / 640px / 1024px. The page is a stack of full-bleed section bands separated by a hairline top border. Bands alternate Cotton Ground and Sheet. Section padding is 80px, rising to 112px from 1024px (the close band is 96 / 128px). The sticky header is 64px tall on the ground colour with a bottom hairline.

Inside a band, the recurring structure is an asymmetric two-column split at 1024px and up: a heading column against a wider content column (for example 1fr : 1.4fr, 1fr : 1.6fr, or the hero's 1.05fr : 1fr), with a 64px column gap and a 56px block gap before the content below the heading. Below 1024px everything stacks.

Lists are syllabus rows. Each belt is an `article` with a 14rem rank column (band, name, numeral, summary) and a ruled list of modules in three columns: a 2.25rem index, the title, and right-aligned tabular meta. Rows are 12px tall-padded with 70% hairlines between them. Process steps run as columns hung from a single belt band, with 40% keyline dividers. The step that matters is lifted onto a Jade Wash field instead of getting a card.

The belt ladder is horizontal from 640px, with each rung's flex-grow proportional to its module count. Below 640px it becomes a vertical list (a 6.5rem band beside its label) so no label truncates. Auth is a two-panel split at 1024px: a sheet panel with the belt list on the left and a form column capped at 24rem on the right. On phones only the form is shown, with the logo above it.

**The Syllabus Row Rule.** Collections of modules, lessons, exercises or achievements are ruled rows with index, title and meta. They are not grids of boxed cards. A panel (sheet with a hairline border) is for one interactive or framed object, such as a drill, a record or a code comparison.

## Elevation & Depth

The system is flat. Depth is conveyed by two cloth tones (Cotton Ground under Sheet, or Forest Night under Night Sheet), hairline borders, and keylines on belt objects. The only shadow in the build is the input focus halo. Focus everywhere else is a 2px Jade Ring outline at a 2px offset.

### Shadow Vocabulary
- **Focus halo** (`box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring), transparent 75%)`): text inputs on `:focus-visible`, paired with a Jade Ring border.

### Named Rules
**The Flat Cloth Rule.** Nothing casts a shadow. To lift something, change its tone (ground to sheet, or sheet to Jade Wash) and give it a hairline. Hard offset shadows and ambient glows are off-system.

## Shapes

The geometry is square-cut cloth and printed paper. The base radius is 4px, but the build uses its fractions. Controls, inputs, badges, tags and code blocks use 2px. Panels, cards and framed figures use 3px. Belt bands, the rank bar, tape stripes and the seal are fully square. Streak cells are 16px squares at 2px. The here-tag is rounded only on its top corners, like a tag tied to the belt's top edge.

Belt bands are 24px tall (16px in lists, 20px on the phone ladder). Each has a 1px keyline border at 60% (100% on black), four stitch rows drawn as a repeating gradient at 14% keyline, and a rank bar at the tail end in Belt Black (Seal Jade on the black belt) holding 5px tape stripes. The dan track is the same band with a dashed border and straw bars. The seal is rotated -7deg, with a 3px outer border, 3px of air, then a 1px inner border.

**The Square Cut Rule.** Corners stay between 0 and 3px. Nothing in the system is a pill or a circle, whether a badge, avatar frame, progress ring or level token. Progress is linear or striped.

## Components

### Buttons
Buttons are firm and square-shouldered, with no ornament.
- **Shape:** Nearly square corners (2px).
- **Primary:** Jade fill with pale cotton text in 600-weight Archivo. The default is 40px tall with 20px sides, the large size 48px with 28px sides at 1rem, and the small size 32px with 14px sides at 0.8125rem. A trailing arrow icon tightens the end padding by 4px.
- **Hover / Focus:** Hover mixes the fill 18% toward Forest Ink in light mode, and 14% toward white in dark mode. Focus is a 2px Jade Ring outline at a 2px offset. On press the button drops 1px. Transitions run for 150ms on colour and transform only. Disabled is 50% opacity. Async buttons keep one width and opacity across idle, loading and grading, swapping only the icon and label so re-grading never blinks.
- **Ghost:** Transparent with Forest Ink text and a muted icon. Hover fills with Jade Wash and brings the icon up to ink. It is used for "Sign in" and "Reset".
- **Outline:** Transparent with a Field Edge border. Hover darkens the border to 40% ink and fills with Jade Wash. It is used for icon controls such as the theme toggle.
- **Destructive:** Clay text and a 30% Clay border on transparent, with a 10% Clay wash on hover. It is never filled.
- **Link:** Jade text with a 40% jade underline that goes solid on hover. Secondary text links ("Read the syllabus") are 600-weight ink with a 30% ink underline.

### Chips
- **Here tag:** Straw fill with Straw Ink text, 0.75rem at 600, 2px by 8px, and top corners only. It sits on the top edge of the current belt and reads "You start here", then "Stripe earned".
- **Badge:** Jade Wash with ink text at 2px by 6px and 2px corners. Variants are muted (secondary), a hairline outline, and a Clay 8% wash for errors.

### Cards / Containers
- **Corner Style:** 3px.
- **Background:** Sheet on the ground band, or the ground colour when the panel sits on a Sheet band (for example the JS/Python comparison).
- **Shadow Strategy:** None (see Elevation & Depth).
- **Border:** 1px hairline. Internal regions are split by hairlines, not gaps.
- **Internal Padding:** 24px (16px for the small card). The drill panel uses 20px sides.

### Inputs / Fields
- **Style:** Sheet fill, a 1px Field Edge border, 2px corners, 40px tall with 12px sides. Text is 1rem on phones and 0.875rem from 768px. Placeholder text is muted.
- **Focus:** The border turns Jade Ring and the 3px focus halo appears. Hover darkens the border to 35% ink.
- **Error / Disabled:** Invalid fields get a Clay border. Form errors are a Clay alert with a 30% border over an 8% wash. Disabled is 50% opacity.
- **Labels:** Sentence case, 0.875rem at 600 (see The Sentence Case Rule).

### Navigation
- **Header:** Sticky and 64px on Cotton Ground, with a bottom hairline. The logo is on the left. In-page links sit in the centre at 0.875rem in muted ink with a 28px gap, turning ink on hover. On the right are the theme toggle (outline icon button), "Sign in" (ghost, small) and the primary CTA (small). Below 768px the centre links hide and the CTA shortens to "Start".
- **Footer:** Logo, muted links, and a copyright line, above a hairline.

### Belt Band (signature)
One belt of cloth: the dye fill, the keyline, the stitch rows, and a tail rank bar with tape stripes (see Shapes). Earned stripes are Tape. A stripe that has just been earned is Straw and plays **tape-on**: it is revealed top-down by `clip-path` while it drops 6px, over 420ms on the expo-out curve. A fading stripe (skill due for review) is at 35% opacity. The band drives the belt ladder, syllabus rows, auth panel and rank figures.

### Examiner's Seal (signature)
A square seal-jade stamp rotated -7deg, with double borders. "Passed" is set in condensed 800 uppercase with a smaller detail line ("Drill 1", "Module grading"). When work is passed it plays **seal-stamp**: it drops from 1.35x with a 2px blur to 0.96x at 60%, then settles at 1x over 520ms on the expo-out curve. It carries `role="img"` with a full label.

### Belt Knot Mark
A 32px-grid SVG of a tied belt knot with a keyline stroke. It is jade for visitors and the learner's current belt dye once signed in. A black-belt mark switches to an ink fill in dark mode so it keeps its mass. It sits beside the semicondensed lowercase wordmark with an 8px gap.

### Live Drill
An in-browser graded exercise panel. It contains a task header, a mono editor on a strict 24px line grid with a hairline-separated tabular gutter, ruled test-case rows (a muted circle when idle, a Pass Green check, or a Clay cross with "got …"), a hairline action bar, and a Jade Wash success strip holding the seal. While re-grading, results dim to 55% instead of clearing, so the layout never jumps. Ctrl + Enter submits and Tab inserts four spaces.

## Do's and Don'ts

### Do:
- **Do** use Jade (oklch(0.52 0.11 162)) for every primary action and link, and keep it the only action colour on any screen.
- **Do** reserve Straw (oklch(0.88 0.12 95)) for the learner's current position and the moment of earning: the here-tag, the fresh stripe and pending dan bars.
- **Do** show rank and progress as stripes on a Belt Band. Show counts as a condensed tabular Numeral with a small muted unit ("9 kyu").
- **Do** set lists of modules, lessons, exercises and achievements as ruled syllabus rows with index, title and right-aligned tabular meta.
- **Do** separate regions with hairlines and the ground/sheet tone shift. Give a framed object 3px corners and a 1px hairline.
- **Do** keep labels, headings and menu items in sentence case at normal tracking, in condensed Archivo for meta.
- **Do** play tape-on (420ms) or seal-stamp (520ms) only when the learner earns something, and keep every other state change at 150ms on colour, opacity or a 1px press.
- **Do** honour `prefers-reduced-motion`: animations and transitions collapse to 0.01ms and smooth scroll turns off. Celebrations and confetti must respect it too.
- **Do** design dark mode as forest-green cloth with Night Jade, not as an inverted light theme, and check both themes for every new surface.
- **Do** use Lucide line icons at 16px, muted by default and ink on hover, with `aria-hidden` when they are decorative.

### Don't:
- **Don't** introduce saturated or dominant accents. Saturated red was explicitly rejected. Clay (oklch(0.54 0.13 30)) is for errors only, as text or a thin border, never a fill.
- **Don't** use flat grey or slate neutrals. Every neutral carries the green tint.
- **Don't** use belt dyes for categories, difficulty, charts or decoration. Dye means rank.
- **Don't** use drop shadows, glows or hard offset shadows. The input focus halo is the only shadow.
- **Don't** use pills, circles or radii above 3px, including circular progress rings, rounded-full level badges and pill tabs.
- **Don't** use letter-spaced uppercase labels, eyebrows or kickers. The Seal's stamped lettering is the only uppercase in the system.
- **Don't** use emoji as icons or status (no 🔥 streaks, no trophy glyphs).
- **Don't** build dashboards as grids of stat cards. Put numbers in a record figure or a ruled row.
- **Don't** hardcode Tailwind palette colours (amber, emerald, red, blue and so on) or hex values in components. Use the tokens.
- **Don't** fabricate social proof. Example data must be labelled as an example, as the training-record figure is.

### Known drift to remove (not the system)
The in-app pages (dashboard, modules, lessons, exercises, projects, profile, settings, admin) have not been rebuilt. They inherit the tokens and base components but still carry legacy patterns that must go when they are rebuilt:
- The tracked uppercase label pattern (`tracking-widest uppercase`, over 60 occurrences) in page headers and section labels. It is also baked into the shared `Label` (so it shows on the reviewed sign-up and sign-in forms), `DialogTitle`, `DropdownMenu` items and labels, and the `Select` group label.
- Stat-card grids, circular progress rings (`circular-progress`), rounded-full level badges, and pill-style milestone markers.
- Emoji in streaks and achievements. `lib/theme-config.ts` still defines the old vivid blue, purple and pink palette and the fire emoji.
- Hardcoded `amber-*`, `emerald-*` and `red-*` difficulty and status colours in module and lesson views.
- Confetti hues in `components/gamification/confetti.tsx` (indigo, violet, and a 0.18-chroma red) are off-palette. They should draw from jade, straw and the belt dyes.
