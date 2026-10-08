import { publicOrigin } from "@/lib/public-origin";

/** /llms.txt: a short, plain description of the site for AI agents (llmstxt.org) */
export const dynamic = "force-static";

const PYTHON = [
  "Python for developers",
  "Collections and control flow",
  "Functions and modules",
  "Pythonic idioms and the standard library",
  "Object-oriented Python",
  "Errors, files and context managers",
  "Testing with pytest",
  "Iterators, generators and decorators",
  "Types, Protocols and Pydantic",
  "Tooling and packaging",
  "Data model and internals",
  "Concurrency: asyncio, threads and processes",
  "Performance and profiling",
  "HTTP and APIs",
  "Web services with FastAPI",
  "Data and databases",
];

const AUTOMATION = [
  "Automation foundations",
  "LLM fundamentals",
  "Structured output and tool calling",
  "Retrieval (RAG)",
  "Agents",
  "MCP",
  "Production AI systems",
  "Portfolio and client work",
];

export function GET() {
  const origin = publicOrigin();
  const body = `# pylearn

> A free, graded course that takes anyone, from their first line of code, to advanced Python, then to building AI automation. Lessons, drills and gradings run in the browser; ranks follow the martial-arts belts, from 16 kyu (white belt) to black belt. People who have never programmed start with a 4-hour on-ramp in plain language; developers can test out of what they know.

Everything is free. Lessons and drills need a free account; the pages below are public. The optional AI tutor and reviewer use the learner's own Anthropic, OpenAI or Google key, so the learner pays that provider directly. For people 16 and over.

## Pages

- [Home](${origin}/): try a line of Python in the browser, how it works, who it's for, the syllabus, Python next to JavaScript, and questions (cost, time, what you need)
- [Create an account](${origin}/auth/signup): start at the white belt
- [Sign in](${origin}/auth/signin)
- [Privacy policy](${origin}/privacy): what is stored, who handles it, and how to delete it

## Start here (optional on-ramp, about 4 hours, no grade)

- Programming from zero: what a program is, values and names, text and numbers, decisions, loops, your first function

## Python track (16 modules, kyu ranks)

${PYTHON.map((t, i) => `- ${i + 1}. ${t}`).join("\n")}

## AI automation track (8 modules, dan ranks, after the black belt)

${AUTOMATION.map((t, i) => `- A${i + 1}. ${t}`).join("\n")}

## How it works

- Each lesson ends in drills graded in the browser with real Python (Pyodide).
- Each module ends in a checkpoint grading and a capstone project, tested automatically in the learner's own GitHub repository and reviewed by an examiner.
- AI lessons are provider-neutral (Anthropic, OpenAI); the optional AI tutor runs on the learner's own API key (Anthropic, OpenAI or Google).
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
