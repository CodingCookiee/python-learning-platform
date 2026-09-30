Northwind's account managers spend twenty minutes before every sales call looking a prospect up:
recent news, job ads, what the company says about itself. They want an assistant that does the
looking, and hands them a short summary in which every fact links to where it came from, because
nobody walks into a call quoting a fact they can't check. Finance has one condition: a research run
must never cost more than five cents.

You'll build it as one module, `research.py`, using everything in this module: the agent loop from
lesson 2 with a validated final answer, tools that return small observations and errors the model
can act on, a scratchpad of notes, a budget checked before every call, a step cap, loop detection,
and a trace of every action. It takes an `llm` with the course's neutral interface, so the same
code runs against a scripted fake in the browser and against your A2 client on your machine.

## A sample run

With the scripted model and the fake search service in the starter, `python research.py` prints:

```text
Question: What has Harbour Dental announced this year, and is it a good time to pitch them online booking?

Harbour Dental opened a second clinic in Leeds in August 2026 [1] and is hiring two receptionists for it [2]. Its practice manager says phone bookings are swamping the front desk [1], so online booking is a timely pitch.

Sources:
  [1] harbour-leeds-opening  Harbour Dental opens second clinic in Leeds  https://news.example/harbour-leeds
  [2] harbour-jobs  Receptionist vacancies, Harbour Dental Leeds  https://jobs.example/harbour-dental

Stopped: finished after 7 steps, $0.0357 of $0.05
Trace: 8 entries written to trace.jsonl
```

and `trace.jsonl` starts like this, one line per action:

```text
{"step": 1, "tool": "search", "arguments": {"query": "Harbour Dental 2026 news"}, "ok": true, "cost_so_far": "0.00285"}
{"step": 2, "tool": "read", "arguments": {"doc_id": "harbour-leeds-opening"}, "ok": true, "cost_so_far": "0.00645"}
{"step": 3, "tool": "take_note", "arguments": {"text": "Opened a second clinic in Leeds on 18 August 2026.", "source_id": "harbour-leeds-opening"}, "ok": true, "cost_so_far": "0.01080"}
```

Step 3 has two entries, because the model took two notes in one response. The last line is the
accepted `finish`, at $0.03570.

## The design

| Piece | Kind | Job |
|-------|------|-----|
| `TOOLS` | list (in the starter) | The four tool definitions the model sees: `search`, `read`, `take_note`, `finish` |
| `Source`, `Note`, `TraceEntry`, `Report` | dataclasses (in the starter) | What the run produces |
| `SearchClient` | class | `search(query, limit)` and `read(doc_id, page)` over an injected `httpx.Client` |
| `Budget` | class | Worst case before each call, actual cost after, never over the limit |
| `Research` | dataclass (in the starter) | Sources seen, documents read, notes; builds the system prompt with the notes |
| `run_tool` | function | Runs `search`, `read` or `take_note`, returning a small JSON observation |
| `finish_problems` | function | Everything wrong with a `finish` call, or `[]` |
| `research_question` | function | The agent loop; always returns a `Report` |
| `trace_jsonl` | function | The trace as JSON lines |

`clip`, `format_report`, `assistant_message`, the fake search service (`demo_search_client`), the
scripted model (`demo_llm`) and `main` are written for you.

## Requirements

### The search client

`SearchClient(http)` calls the search service with a 10 second timeout:

- `search(query, limit=5)` sends `GET /search?q=...&limit=...`, with `limit` clamped to 1..10, and
  returns `{"results": [{"id", "title", "url", "snippet"}, ...]}`.
- `read(doc_id, page=1)` sends `GET /docs/{doc_id}?page=...` and returns `id`, `title`, `url`,
  `page`, `pages` and `text`.

Failures raise `ToolError` with a message written for the model (lesson 3): a timeout says to try
once more or finish with what it has; a 404 says to use an id from the search results; any other
error says the service is unavailable and not to retry. None of them includes a hostname or a
stack trace.

### The tools

`run_tool(name, arguments, research, client)` returns a JSON string, or raises `ToolError` (a
`TypeError` from bad arguments is fine too; the loop catches both):

- **search** records every result in `research.sources`, and returns only `id`, `title`, `url` and
  `snippet` for each, plus a reminder that results must be read before they're cited.
- **read** records the document as a source and in `research.read_ids`, and returns its fields
  clipped to `OBSERVATION_CHARS` with `clip`.
- **take_note** saves a `Note(text, source_id)` and returns `{"saved": <count>}`. A `source_id` the
  run hasn't **read** is a `ToolError`: `Read <id> before taking notes from it.`
- Any other name is a `ToolError` listing the four tools.

The notes are the agent's scratchpad (lesson 4): `research.system_prompt()` puts them in the system
prompt, and the loop builds a fresh system prompt for every call.

### The final answer

`finish(summary, citations)` ends the run only when `finish_problems` finds nothing wrong:

- `summary` is a non-empty string that contains at least one `[n]` marker, and every marker is
  between 1 and the number of citations.
- `citations` is a non-empty list of document ids, **every one of which the run has read**. A
  search snippet doesn't count, and nor does a URL the model found written inside a document.

An invalid `finish` doesn't stop the run: append the assistant message, then the problems as the
`finish` call's error result, and `{"error": "Not run, because this turn called finish."}` for any
other call in that response (lesson 2's stretch drill). A reply with no tool calls gets `NUDGE`
once; a second one stops the run with `no_finish`.

### The limits

Before every model call, in this order:

1. **Steps.** At most `max_steps` (`MAX_STEPS`, 10) model calls; after that, `step_limit`.
2. **Budget.** `budget.worst_case(messages, system, TOOLS, MAX_TOKENS)` is the estimated input
   (system prompt, messages and tools as JSON, at four characters a token) plus `MAX_TOKENS` of
   output, at `PRICE`. If `budget.allows(...)` says no, stop with `budget` **without making the
   call**. After each call, `budget.charge(response.usage)`.

And before running each tool call: count calls by name and canonical arguments
(`json.dumps(arguments, sort_keys=True)`). The third identical call stops the run with `loop`,
without running it.

### The report and the trace

`research_question(llm, question, client, *, max_steps=MAX_STEPS, budget=None)` creates a fresh
`Budget` when it isn't given one, and returns a `Report` whatever happens: the question, the summary
and cited `Source`s (or `None` and `[]`), the notes, the stop reason (`finished`, `no_finish`,
`budget`, `step_limit` or `loop`), the model calls made, the dollars spent and the trace.

The trace gets one `TraceEntry(step, tool, arguments, ok, cost_so_far)` per action: each tool call
(with `ok=False` for an error), each `finish` (accepted or not), and `(reply)` for a plain reply.
`trace_jsonl(report)` joins `entry.to_json()` lines, each ending in a newline. A person reading the
trace should be able to see exactly what the agent did, and what each step had cost by then.

## Getting started

1. Copy the starter into `research.py`. Until the stubs are written, `python research.py` fails in
   `format_report`, because `research_question` returns `None`; that's expected.
2. Write `SearchClient` and try it by hand: `demo_search_client().search("Harbour Dental")` and
   `.read("harbour-jobs")`, then `.read("harbour-closing")` for the 404.
3. Write `Budget`, and check it the way lesson 7's fix drill did: with calls of a fixed usage,
   spending never passes the limit, and the call that could pass it is never made.
4. Write `run_tool` and `finish_problems`, and test them with a `Research()` and no model at all.
5. Write `research_question` and `trace_jsonl`, run `python research.py`, and compare the output
   and the trace with the sample line by line.

### Running it

- **In the browser or offline**, `demo_llm()` builds the scripted model from `plp_fakes`, and
  `demo_search_client()` serves the documents in `DOCS` through `fake_api`, over a real
  `httpx.Client`. To run it on your machine without a key, copy `plp_fakes.py` next to
  `research.py`.
- **Against a real model**, set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` and put your A2 client
  (`llm.py`) next to `research.py`. `real_llm()` imports its factory; rename `make_llm` if yours is
  called something else. The search service stays the fake one, so a real model researches the
  same five documents. Its path through them, and its cost, will differ from the script, but every
  limit and every citation rule must still hold.

```bash
uv run --with httpx research.py
```

## Try these

Before you submit, check each of these with a `ScriptedLLM` of your own against
`demo_search_client()`:

- **A looping model.** `search(query="Harbour Dental")` five times: the run stops with `loop` after
  3 steps, and the third search never reaches the service.
- **An unread citation.** Search, then `finish` citing `harbour-jobs` without reading it: the
  finish is rejected with a reason naming `harbour-jobs`. Read it, finish again: `finished`.
- **A missing document.** `read(doc_id="harbour-closing")`: an error observation, not an exception.
- **A note from an unread document.** `take_note(..., source_id="harbour-reviews")` before reading
  it: refused, and no note is saved.
- **A budget-draining model.** Replies with `Usage(6000, 400)`: the run stops with `budget` after
  2 calls, at $0.048, never over $0.05.
- **A prompt injection.** `harbour-reviews` tells the reader to cite `https://evil.example`. A
  `finish` citing that URL is rejected, because it isn't a document the run read; the only
  citations that can get through are ids from `read`.
- **The step cap.** Twelve different searches with `max_steps=4`: `step_limit` after 4 calls.

## Stretch goals

- **Tests.** A `test_research.py` with a test per requirement, all against `ScriptedLLM` and the
  fake search service.
- **History that stays small.** Trim the history before each call (lesson 4's `trim_history`), and
  show that the notes keep the facts the summary needs.
- **Parallel reads.** When one response asks to read several documents, fetch them concurrently
  with an async search client and `asyncio.gather`, and time the difference with a slow fake.
- **A real search API.** Point `SearchClient` at a search provider you have a key for, with the key
  read from the environment, and keep the fake for tests.
- **A deadline.** Add a wall-clock limit with an injected `clock`, as in lesson 7's guarded run.
- **An endpoint.** `POST /research` in FastAPI that runs `research_question` and returns the report
  and the trace as JSON, with the llm provided by a dependency.

## How to submit

Push `research.py`, your tests and a short `README.md` (what it does, how to run it offline and with
a key, and a sample trace) to a GitHub repository, and submit its link on this capstone's page. The
review runs `python research.py` against the sample, runs the scenarios above and a few hidden ones
through `research_question` with `ScriptedLLM`, and reads your code against the criteria: nothing
over the cap, nothing past the step cap, no citation that wasn't read, and every stop a `Report`.
