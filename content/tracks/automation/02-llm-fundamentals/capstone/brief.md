Harbour Bikes gets about 3,000 support tickets a day, and they want each one sorted into a category
the moment it arrives, so billing questions go to finance and damaged deliveries go to the warehouse.
They've asked you which model to use. Their head of support has read that the biggest model is
"always best"; their finance lead has read that the smallest is "good enough for everything". Both
have a budget in mind, and neither has any evidence.

You'll build the evidence: a **model comparison harness** that runs one task, the same prompt and
the same eval set, across providers and models, then reports how often each model was right, how
fast it answered, and what it cost. It runs offline against simulated models, so you can build and
test it with no keys, and then for real on every provider you have a key for. Along the way you'll
assemble the `llm.py` client from this module's drills, which every later module in the track uses.

## A sample run

```text
$ python compare.py --offline
Ticket categories: 12 cases, temperature 0

Model                          Quality  Median ms  p90 ms  Errors      Cost   Per 1k
------------------------------------------------------------------------------------
offline/offline-small            75.0%        425     450       0   $0.0008    $0.07
offline/offline-medium           91.7%        905     930       0   $0.0040    $0.33
offline/offline-large            91.7%      2,075   2,100       1   $0.0175    $1.46
------------------------------------------------------------------------------------
Recommended: offline/offline-medium, the cheapest with quality of at least 90% and a median under 1,500 ms.
```

The offline models are pretend ones in the starter: each gets a fixed number of the 12 cases right
at a steady speed, and the large one hits an "overloaded" error on one case. The prices are the
starter's `EXAMPLE_PRICES`, invented for practice. With stricter bars,
`python compare.py --offline --min-quality 0.95 --max-latency-ms 1000` prints the same table and
then `No model reached quality of at least 95% and a median under 1,000 ms.`

## What you're building

Two files:

| File | Holds |
|------|-------|
| `llm.py` | Your provider-neutral client, assembled from the drills |
| `compare.py` | The harness: the task, the eval set, the comparison and the report (the starter) |

### `llm.py`

Put together what you wrote in this module's drills:

- `ToolCall`, `Usage`, `LLMResponse` and the `LLM` protocol (lesson 3).
- `LLMError` and its subclasses, `error_from_response` and `send_with_retries` (lesson 7).
- The tool and message translations, `AnthropicClient` and `OpenAIClient` (lesson 3), with
  `raise_for_status()` replaced by `send_with_retries`, and an optional `sleep=time.sleep`
  constructor argument passed through to it, so tests don't wait.
- `make_llm` (lesson 3).

Nothing in `compare.py` builds provider JSON or reads a provider's response shape. If it does, that
code belongs in an adapter.

### `compare.py`

The starter has the task and everything around it: the categories, the system prompt, 12 eval
cases, the `Target` and `ModelResult` dataclasses, the offline models, `load_prices` and `main`. You
write the parts marked `...`:

| Function | Does |
|----------|------|
| `build_messages(case)` | The one user message: the ticket between `<ticket>` tags, each on its own line |
| `score(reply_text, case)` | `1.0` if the reply is the expected label once stripped, lower-cased and without a trailing `.` or `!`; otherwise `0.0` |
| `evaluate(target, cases, *, clock)` | Runs every case through `target.llm.complete(...)` with `system=SYSTEM`, `model=target.model`, `max_tokens=5` and `temperature=0`, and returns a `ModelResult` |
| `price(result, prices)` | The run's total cost from its token counts, or `None` if the model isn't in `prices` |
| `run_comparison(targets, cases, *, prices, clock)` | Evaluates and prices each target, in order |
| `recommend(results, *, min_quality, max_latency_ms)` | The cheapest result whose quality is at least `min_quality` and whose median latency is at most `max_latency_ms`, preferring higher quality on a tie in cost; `None` if nothing qualifies or has a price |
| `format_report(...)` | The report, exactly as in the sample run |
| `real_targets(env)` | The real models to compare (see below) |

And on `ModelResult`: `quality` (the mean of `scores`), `median_ms` and `p90_ms` (nearest-rank
percentiles of the successful calls' latencies, or `None` when there were none), and
`cost_per_1000()`.

### Timing and failures

`evaluate` reads the clock it's given before and after each call and records the difference in
milliseconds. In real runs that's `time.perf_counter`; offline, it's the starter's `FakeClock`,
which only moves when an offline model "takes time", so the sample numbers are exact.

A call that raises `RuntimeError` (your `LLMError` is one, and so are the fakes' scripted failures)
adds 1 to `errors` and a score of 0 for that case, records no latency, and the run carries on. Your
adapters have already retried what could be retried, so an error that reaches the harness is a real
failure, and a model that fails often is worse than its right answers suggest. That's why
`offline-large` scores 91.7%, not 100%.

### The report

- The title line: `Ticket categories: 12 cases, temperature 0`, then a blank line.
- A header and a rule of 84 dashes, one row per result, another rule. Columns: the label
  left-aligned in 30, then right-aligned quality (a percentage to one decimal place) in 8, median
  and p90 latency in 11 and 8 (whole milliseconds with thousands separators, or `-` when there are
  none), errors in 8, cost in 10 (`$` and four decimal places) and cost per 1,000 tasks in 9 (two
  decimal places). A missing cost is `n/a`. The starter's `money` and `millis` helpers do the
  formatting.
- The recommendation line, or the "No model reached..." line, as in the sample.
- If any model has no price, a last line: `Some models have no price: add them to your prices file.`

### Real runs

`real_targets(env)` builds one client per provider whose key is set, and a `Target` for each model
to compare on it, labelled `provider/model`:

| Variable | Meaning |
|----------|---------|
| `ANTHROPIC_API_KEY` | compare Anthropic models |
| `ANTHROPIC_MODELS` | comma-separated; defaults to `claude-haiku-4-5,claude-sonnet-5` (add `claude-opus-5-5` if you like) |
| `OPENAI_API_KEY` | compare OpenAI models |
| `OPENAI_MODELS` | comma-separated and required when the key is set: check OpenAI's models page for current names |

With no keys at all it exits with a message suggesting `--offline`. Give each `httpx.Client` a
timeout suited to LLM calls (`httpx.Timeout(60.0, connect=5.0)`). Keys come only from the
environment and never appear in output or logs.

Prices come from a JSON file you write yourself, in dollars per million tokens. Take the numbers
from each provider's pricing page on the day you run it, and keep the note so nobody mistakes the
file for current prices later:

```text
{
  "_note": "USD per million tokens, from the providers' pricing pages on <date>",
  "claude-haiku-4-5": {"input": "...", "output": "..."},
  "claude-sonnet-5": {"input": "...", "output": "..."}
}
```

```bash
export ANTHROPIC_API_KEY=...        # never commit these
export OPENAI_API_KEY=...
export OPENAI_MODELS=<two models from OpenAI's current list>
uv run --with httpx compare.py --prices prices.json
```

## Getting started

1. Copy the starter into `compare.py`, and create `llm.py` next to it from your drill solutions.
2. Write `build_messages`, `score` and `percentile`, and try them in the REPL on `CASES[0]`.
3. Write the `ModelResult` properties, then `evaluate` and `price`. Run
   `evaluate(offline_targets(FakeClock())[0], CASES, clock=...)`: remember the offline models and
   `evaluate` must share one `FakeClock`, so build the targets with the clock you pass in.
4. Write `run_comparison`, `recommend` and `format_report`, then run `python compare.py --offline` and
   compare it with the sample line by line.
5. Write `real_targets`, set one key, and run it for real with a prices file.

## Test it with the fakes

Write `test_compare.py` that runs without a network or a key, using the course's fakes (save
`plp_fakes.py` from `/py/plp_fakes.py` on this site next to your files; it needs only httpx). At
least:

- `evaluate` with `ScriptedLLM(["billing", "Delivery.", Fail(529), ...])` scores, counts errors and
  sends the right system prompt, messages and temperature (check `.calls`).
- `run_comparison` through your real `AnthropicClient` and `OpenAIClient`, over `anthropic_api(...)`
  and `openai_api(...)` transports. A reply can be a function of the request, so
  `lambda body: expected_label_for(body["messages"][-1]["content"])` answers every case correctly.
  Script a `Fail(429, retry_after=1)` and check your adapter retried it (pass a list's `append` as
  `sleep`) without the harness seeing an error.
- `recommend` with results where nothing qualifies, where two tie on cost, and where the only
  qualifying model has no price.

## Stretch goals

- **Several runs.** A `--repeat N` option that runs each case N times at a temperature you choose
  and reports how often each model's answers agree with themselves, which is the variance lesson 1
  warned about, measured.
- **A second task.** Summaries, scored by a function that checks the order number is present and
  the summary is at most 20 words. Make the task (prompt, cases, scorer, `max_tokens`) a dataclass
  so the harness runs either.
- **Time to first token.** Stream each call with your lesson 5 code and report time to first token
  alongside total time.
- **A cost cap.** Wrap each client in your `BudgetedLLM` so a comparison can never spend more than a
  set amount, and report which models were cut short.
- **CSV out.** `--csv results.csv` writes one row per case per model, for the client's spreadsheet.

## How it's tested

Automated tests run in your repository with Python 3.13, no keys and no network. They install
`httpx` themselves (list it in a `requirements.txt` or `pyproject.toml` too), then:

- **Import `llm` and `compare`** from the top of the repository. Importing either must not need a
  key, build a client or send anything: keep that inside functions and `main`.
- **Run `python compare.py --offline`**, with and without `--min-quality 0.95 --max-latency-ms 1000`,
  and compare what it prints with the sample run line by line (trailing spaces ignored).
- **Call your `compare.py` functions directly**, with the starter's names and keyword arguments:
  `build_messages(case)`, `score(text, case)`, `evaluate(target, cases, *, clock)`,
  `price(result, prices)`, `run_comparison(targets, cases, *, prices, clock)`,
  `recommend(results, *, min_quality, max_latency_ms)` and
  `format_report(results, *, cases, min_quality, max_latency_ms)`. They build `Target`s and
  `ModelResult(label, model, scores=..., latencies_ms=..., errors=..., cost=...)` themselves, so keep
  the starter's fields. In `evaluate` the model is a scripted fake with `complete()` that raises a
  `RuntimeError` for a scripted failure, and the clock is a fake that only moves while the model
  answers, so time the whole `complete()` call.
- **Build your adapters over fake APIs**: `AnthropicClient(http, *, api_key, model, sleep=time.sleep)`
  and `OpenAIClient` with the same arguments, where `http` is an `httpx.Client` whose
  `base_url` is `https://api.anthropic.com` or `https://api.openai.com` and whose transport is an
  `httpx.MockTransport` fake of `POST /v1/messages` or `POST /v1/chat/completions`, and `sleep` is a
  list's `append`. They check the requests (headers, `system`, `temperature`, `max_tokens`, tools and
  tool history), the `LLMResponse` you return, and your retries: a 401 or 400 raises an `LLMError`
  (a `RuntimeError` with `.status`) at once, a 429 waits its `retry-after` before trying again, and
  a 529 or a timeout is retried and, if it never recovers, ends in an `LLMError`.
- **Call `make_llm(env, *, http=...)`** with a plain dict for `env` (`LLM_PROVIDER`,
  `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`); a missing key's error
  names the variable.
- **Call `real_targets(env)`** with a plain dict, never `os.environ`. It must not send anything. With
  no keys it stops (raising `SystemExit` is fine) with a message containing `--offline`; with
  `OPENAI_API_KEY` but no `OPENAI_MODELS` the message names `OPENAI_MODELS` and never the key.
- **Run your own tests** with `python -m pytest test_compare.py`, which must pass, so commit
  `plp_fakes.py` next to it.

## How to submit

Push `llm.py`, `compare.py`, `test_compare.py`, `plp_fakes.py`, an example `prices.json` (with its
note and date) and a `README.md` to a public GitHub repository, and submit its link on this
capstone's page. Then connect the repository on the capstone page and add the workflow file pylearn
gives you (`.github/workflows/pylearn.yml`): the tests above run on every push, and the capstone page
shows the results. The README says how to run it offline and for real, and reports one real
comparison you ran: the date, the models, the prices you used and where they came from, the table,
and which model you'd recommend to Harbour Bikes and why. The review also reads the code against the
criteria: nothing provider-specific outside the adapters, keys only from the environment, failures
reported rather than crashed on, and every dependency injected.
