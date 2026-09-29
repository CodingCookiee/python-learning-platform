---
slug: llm-how-models-work
title: How LLMs work, just enough
summary: Tokens, context windows and next-token sampling, which explain cost, limits, and why the same prompt gives different answers.
minutes: 35
exercises:
  - llm-estimate-tokens
  - llm-predict-temperature
  - llm-sample-next-token
  - llm-fit-context
---

A client asks you to summarise their support tickets with an LLM. Before you write a line of API
code you need answers to three questions they will ask: how much will it cost, how long can a
ticket be, and why did it give a different summary when they ran it twice? All three come from the
same small set of ideas. You don't need the maths of transformers to build automations, but you do
need these ideas, because every API parameter in this module is one of them.

## Text goes in as tokens

A model doesn't read characters or words. Its input is split into **tokens**: common words are one
token, rarer words are a few, and punctuation, spaces and digits have tokens of their own.
"Refund" might be one token, "unrefundable" three. Every provider bills by the token, limits by the
token and measures speed in tokens per second, so tokens are the unit you'll think in.

Each model family has its own tokenizer, so the same text is a different number of tokens on
Anthropic and OpenAI. For planning, the rule of thumb is **about four characters of English per
token**:

```python
import math


def estimate_tokens(text):
    return math.ceil(len(text) / 4) if text else 0


ticket = "Hi, my order #1042 arrived with a cracked screen. Can I get a replacement?"
len(ticket), estimate_tokens(ticket)
```

The estimate is rough. Code, URLs, numbers and non-English text all use more tokens per character,
sometimes twice as many. When you need exact numbers, ask the tokenizer:

```python norun
# Locally, for OpenAI models: uv add tiktoken (it downloads its vocabulary on first use)
import tiktoken

encoding = tiktoken.get_encoding("o200k_base")
len(encoding.encode(ticket))
```

Anthropic has no downloadable tokenizer; its API has a `POST /v1/messages/count_tokens` endpoint that
takes the same body as a real request and returns `{"input_tokens": ...}` without running the model.
Both providers also report the exact count after every call, in the response's usage fields, which
is what you'll track cost from later in this module.

> [!NOTE]
> `tiktoken` doesn't work in these drills: it downloads its vocabulary over the network, and the
> browser sandbox has none. The drills use the four-character rule, as the course's fakes do.

## The context window

A model can attend to a fixed number of tokens at once: its **context window**. Everything counts
against it: the system prompt, every message in the conversation so far, any documents you paste
in, and the reply the model is about to write. That last part catches people out. If a model has a
200,000-token window and you ask for up to 4,000 tokens of output, your input can use at most
196,000.

Two consequences shape real automations:

- **Long conversations have to be trimmed.** A support bot that sends the whole chat history on
  every turn eventually overflows, and the API rejects the request with a 400. You drop or summarise
  the oldest turns.
- **More context isn't free.** You pay for every input token on every call, and models get slower
  and less precise as the window fills. Send what the task needs, not everything you have.

Context windows differ by model and change with new releases, so read the number from the model's
documentation rather than hard-coding one you remember.

```quiz
question: A model has a 100,000-token context window. Your system prompt is 2,000 tokens, the conversation is 95,000 tokens, and you ask for max_tokens of 4,000. What happens?
options:
  - It works; only the input has to fit
  - The request is too big; input plus the requested output must fit in the window
  - The model silently forgets the system prompt
answer: 1
explain: "2,000 + 95,000 + 4,000 = 101,000, which is more than 100,000. The window covers the reply too, so trim the history or lower max_tokens."
```

## One token at a time

A model generates text by repeatedly answering one question: given everything so far, what's the
next token? It produces a score, called a **logit**, for every token in its vocabulary. The scores
are turned into probabilities with **softmax**, one token is chosen, appended, and the loop runs
again until the model emits a stop token or hits `max_tokens`.

Here is that choice for one step, with four candidate tokens after "Your order has been":

```python
import math

logits = {"shipped": 3.1, "delivered": 2.4, "cancelled": 0.9, "refunded": 0.2}


def probabilities(logits, temperature=1.0):
    scaled = {token: score / temperature for token, score in logits.items()}
    top = max(scaled.values())
    weights = {token: math.exp(score - top) for token, score in scaled.items()}
    total = sum(weights.values())
    return {token: round(weight / total, 3) for token, weight in weights.items()}


probabilities(logits)
```

"shipped" is the most likely next token, but "delivered" has a real chance too. Subtracting the top
score before `exp` doesn't change the result; it stops `math.exp` overflowing when scores are large.

This loop is why output tokens cost more than input tokens on every provider's price list: the
input is processed in one pass, but each output token is a separate step.

## Temperature and top-p

**Temperature** divides the logits before softmax. Below 1 it widens the gaps between scores, so the
favourite gets more likely; above 1 it narrows them, so unlikely tokens get a chance. It never
changes which token is the favourite.

```python
import math

logits = {"shipped": 3.1, "delivered": 2.4, "cancelled": 0.9, "refunded": 0.2}


def probabilities(logits, temperature=1.0):
    scaled = {token: score / temperature for token, score in logits.items()}
    top = max(scaled.values())
    weights = {token: math.exp(score - top) for token, score in scaled.items()}
    total = sum(weights.values())
    return {token: round(weight / total, 3) for token, weight in weights.items()}


cool = probabilities(logits, 0.3)
hot = probabilities(logits, 2.0)
cool, hot
```

**Top-p** (nucleus sampling) cuts the tail instead: sort the tokens by probability and keep only the
smallest set whose probabilities add up to `p`, then sample from those. With `top_p=0.9`, the long
tail of unlikely tokens can never be chosen, however high the temperature.

Temperature 0 means "always take the favourite", called **greedy** decoding. It's what you want for
classification and extraction. For drafting replies or marketing copy, a moderate temperature gives
less repetitive text.

> [!TIP]
> Tune temperature *or* top-p, not both. Some newer models accept only one of them, and some
> reasoning models accept neither, so the neutral client you build sends `temperature` only when you
> pass one.

## Why the same prompt gives different answers

Sampling is random, so with any temperature above 0, two runs of the same prompt pick different
tokens, and once one token differs everything after it can differ too. A seeded random generator
shows the mechanism:

```python
import random

tokens = ["shipped", "delivered", "cancelled", "refunded"]
weights = [0.59, 0.29, 0.07, 0.04]

run_one = random.Random(1).choices(tokens, weights=weights, k=8)
run_two = random.Random(2).choices(tokens, weights=weights, k=8)
run_one, run_two
```

Even temperature 0 isn't guaranteed to be identical across calls: providers batch requests on shared
hardware, and tiny floating-point differences can flip a near-tie. Model versions also change
underneath an alias. Design for it:

- **Don't test automations by comparing exact model output.** Check structure and facts instead,
  which is exactly how this course's drills grade your prompts.
- **Pin model versions** in production, and re-run your checks when you change them.
- **Constrain the output** (a label from a fixed list, JSON with a schema) wherever the next step is
  code, not a person.

## Knowledge cutoffs and hallucination

A model knows only what was in its training data, which stops at a **knowledge cutoff**. It doesn't
know your client's refund policy, today's order status, or anything that happened last month, and it
has no internal signal that says "I don't know this". Asked anyway, it generates the most plausible
continuation, which can be a confident, specific and wrong answer: a **hallucination**.

Hallucinations aren't a bug you can patch; they're the sampling loop doing its job on a question it
can't answer. The fixes are all about what you put in the context:

- **Ground it.** Put the facts the answer needs (the order record, the policy text) in the prompt,
  and tell the model to answer only from them. Module A4 builds this properly as retrieval.
- **Give it a way out.** "If the ticket doesn't say, reply `unknown`" turns a guess into a value your
  code can handle.
- **Check the result in code** wherever you can: an order number that isn't in the database, a date
  in the future, a label outside the list.

```quiz
question: A lead-scoring prompt sometimes returns "very warm", which isn't one of your labels. What's the most reliable fix?
options:
  - Set temperature to 2 so the model explores more labels
  - List the allowed labels in the prompt, and check the reply in code, mapping anything else to "unknown"
  - Ask the same question three times and hope one answer is valid
answer: 1
explain: "Constrain the output in the prompt, then enforce it in code. The prompt makes the valid answer likely; the check makes an invalid one harmless."
```

## Where this leaves you

Tokens are the unit of cost and limits, and about four characters each in English. The context
window holds the input and the reply together. The model picks one token at a time from a
probability distribution that temperature sharpens or flattens and top-p trims, which is why
outputs vary. It knows nothing past its cutoff and will make things up rather than say so, so the
facts go in the prompt and the checks go in your code. The drills have you estimate tokens, predict
what temperature does, write a sampler, and trim a conversation to fit its window.
