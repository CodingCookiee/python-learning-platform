# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** working developers (JavaScript/TypeScript and other languages) moving into Python, then into AI automation engineering. They learn in the evenings and on weekends alongside a full-time job, at about 10–12 hours a week. The founder, Raza, is user zero.
- **Secondary:** motivated beginners with little programming background. They can follow the same path, and the product should never assume prior Python.

## Product Purpose

pylearn takes a learner from first Python syntax to advanced Python confidence, then through a practical AI automation track: workflows and webhooks, LLM APIs, structured output and tool calling, RAG, agents, MCP, production concerns, and portfolio.

Success means a learner can do the thing again without hints. Finishing content does not count. Completion is earned through graded practice, checkpoints and spaced review.

## Positioning

- Practice happens inside the platform. Lessons, runnable examples, auto-graded exercises and checkpoints all run in the browser (Python via Pyodide), so learners don't jump between the app and an IDE until capstone projects.
- It's a single path from Python fundamentals to shipping AI agents, built by a developer for developers. Where it helps, it bridges from JavaScript concepts (JS ⟷ Python comparisons).

## Operating Context

- Short, frequent sessions (about 1–1.5 h on weekdays) plus a longer weekend build block. There's a weekly check-in / learning-log ritual.
- The core loop is: read a lesson section → run examples → solve exercises in the in-app editor → pass the module checkpoint → do the module's capstone project.
- Some work happens outside the app (n8n workflows, deployments, GitHub repos for capstones), and the platform verifies it.
- Admins and authors review project submissions and manage content.

## Capabilities and Constraints

- Next.js 16 App Router, React 19, Tailwind v4, shadcn/Radix components, Monaco editor, Pyodide, Prisma + Neon Postgres, Upstash Redis, Auth.js v5. Deployed on Vercel (free tier).
- The budget is near zero. There's no paid code sandbox. Learners bring their own AI API keys for the tutor and AI features.
- Content: 2 tracks (Python Core → Advanced; AI Automation Engineer), modules → lessons → exercises → checkpoints → capstone projects.
- Gamification is **prominent** and core to motivation: XP, levels, daily streaks, achievements with tiers, milestone celebrations, confetti on first solve.
- There's a light/dark theme toggle.

## Brand Commitments

- Name: **pylearn** (lowercase wordmark). The logo is a belt-knot mark (`components/brand/logo.tsx`, `app/icon.svg`).
- **Balanced color: soft, but with life.** No loud, vibrant or dominant accents; saturated red was explicitly rejected. Flat greys and slate also read as dull and were rejected. The chosen balance is a jade-green accent with a warm straw-yellow highlight, over green-tinted neutrals (2026-09-24).

## Evidence on Hand

- Real curriculum content: 16 modules, 64 lessons, 16 projects, 41 achievements (in the database and `prisma/seed-data/`).
- The roadmap document `AI_Automation_Roadmap_Raza_Awan.pdf` defines the AI track.
- There are no users yet, and no testimonials, learner counts, reviews or press. Do not fabricate any.

## Product Principles

1. **Mastery over completion.** Every progress signal should reflect ability, not clicks.
2. **Stay in flow.** Reading, running and solving happen in one place, without context switches.
3. **Motivation is part of the product.** Rewards are frequent and celebratory, but always tied to real practice.
4. **Honest about cost and effort.** Show time estimates, token cost and difficulty plainly.
5. **Developer-grade craft.** The tool should feel as precise as the tools developers already respect.

## Accessibility & Inclusion

- Target WCAG 2.2 AA. Everything in the editor and grading loop must be usable with the keyboard alone.
- Respect `prefers-reduced-motion`, especially for celebrations and confetti.
