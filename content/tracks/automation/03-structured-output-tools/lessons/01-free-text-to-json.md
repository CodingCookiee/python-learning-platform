---
slug: free-text-to-json
title: From free text to JSON
summary: Automations need fields, not paragraphs. Ask for JSON precisely, then dig it out of whatever the model actually sends.
minutes: 35
exercises:
  - struct-predict-json-loads
  - struct-fix-fenced-reply
  - struct-extract-json
  - struct-ask-for-json
---

A lead-capture form lands in your inbox: "Hi, we're Northwind, about 40 people, looking to replace
our booking tool before March. Could someone show us a demo?" A person reads that in two seconds.
Your automation needs four values out of it: the company, the number of seats, the deadline and
whether to book a demo, because the next step writes them into a CRM. This lesson is about getting
those four values back from a model in a shape code can use.

## Free text is for people

In A2 you asked the model for text and printed it. Here's what happens when code has to act on
that text. The wrong way first: ask for a summary, then pull the fields out with a regular
expression.

```python
import re

monday = "Company: Northwind. Seats: 40. They want a demo."
tuesday = "Northwind (roughly 40 seats) would like a demo before March."

def seats(summary):
    match = re.search(r"Seats: (\d+)", summary)
    return int(match.group(1)) if match else None

seats(monday), seats(tuesday)
```

Same model, same prompt, same kind of email, and on Tuesday the phrasing changed. The regex
returned `None`, the CRM got an empty field, and nobody noticed for a week. Models don't promise a
format unless you ask for one, and even then they only mostly keep it. Free text breaks
automations in three ways:

- **The wording drifts.** "Seats: 40", "40 seats" and "about forty people" mean the same thing,
  and a parser has to guess.
- **Extra text leaks in.** "Sure! Here's the summary you asked for:" arrives in front of the data.
- **Missing values get invented.** Asked for a budget that the email never mentions, a model
  will cheerfully write "$10,000".

The fix for all three is the same: ask for **JSON with named fields**, parse it, and then
validate it (next lesson).

## Ask for JSON, and say exactly which JSON

A vague "reply in JSON" gets you JSON with whatever keys the model feels like. Spell out the
contract in the system prompt: every field, its type, what to do when a value is missing, and that
the reply must be the object and nothing else. Put the input between delimiters so the model can't
confuse the email with your instructions.

```python
LEAD_SYSTEM = """You extract sales leads from inbound emails.
Reply with only a JSON object, no prose and no code fences, with exactly these fields:
  "company": string, the prospect's company name
  "seats": integer or null, how many people would use the product
  "deadline": string or null, when they need it, as the email says it
  "wants_demo": boolean, true only if they ask for a demo or a call
Use null when the email doesn't say. Never guess."""

def lead_messages(email):
    return [{"role": "user", "content": f"<email>\n{email}\n</email>"}]

lead_messages("Hi, we're Northwind, about 40 people...")
```

Then call your A2 client with it, at temperature 0, since extraction wants the same answer every
time rather than creativity:

```python norun
# llm is the provider-neutral client you built in A2, made by your factory with
# the key from ANTHROPIC_API_KEY or OPENAI_API_KEY in the environment.
response = llm.complete(lead_messages(email), system=LEAD_SYSTEM, temperature=0, max_tokens=300)
response.text   # '{"company": "Northwind", "seats": 40, "deadline": "before March", "wants_demo": true}'
```

That's the same call against either provider, because it goes through the neutral interface. The
drills pass a scripted fake instead of a real client, and check the prompt you sent as well as what
you did with the reply.

> [!TIP]
> Name the fields in the prompt exactly as your code names them. If the CRM column is
> `wants_demo`, don't describe it to the model as "demo requested". Every rename is a chance for
> the two to drift apart.

## What models actually send back

Most of the time you'll get the bare object. Run an automation over a few thousand emails and
you'll also see every one of these:

| The reply | Why it happens |
|-----------|----------------|
| The object inside a markdown code fence, tagged `json` | Chat training: models love wrapping code in fences |
| `Here's the lead:\n{...}` | A polite preamble the prompt asked it to skip |
| `{...}\n\nNote: the deadline was vague.` | A helpful comment after the object |
| `{'company': 'Northwind'}` | A Python dict repr, with single quotes, which isn't JSON |
| `{"company": "Northw` | The reply hit `max_tokens` and was cut off |

`json.loads` accepts exactly one JSON value and nothing else, so it fails on all five:

```python raises
import json

FENCE = "`" * 3    # three backticks, the markdown code fence
reply = FENCE + 'json\n{"company": "Northwind", "seats": 40}\n' + FENCE
json.loads(reply)
```

"Expecting value: line 1 column 1 (char 0)" means the very first character, a backtick, isn't the
start of any JSON value. That error, in production, is how most first AI automations fall over.

```quiz
question: Your prompt says "no code fences", and in testing the model never used them. Should the parser still handle fences?
options:
  - "No: the prompt forbids them, so handling them is dead code"
  - "Yes: prompts lower the odds of a format slip, they don't remove it"
  - "Only if you switch providers"
answer: 1
explain: Instructions shift the probabilities; they aren't a guarantee. A parser that tolerates the common slips turns a crash at 3am into a non-event. Native structured outputs (lesson 3) are the way to get a real guarantee.
```

## Extracting JSON robustly

Two tools cover almost every case. For fences, a regular expression that strips them if they're
there. For prose around the object, `json.JSONDecoder().raw_decode`, which parses one JSON value
starting at a position you choose and tells you where it ended, ignoring whatever follows:

```python
import json

reply = 'Here is the lead:\n{"company": "Northwind", "note": "uses {braces}"}\nHope that helps!'

start = reply.find("{")
data, end = json.JSONDecoder().raw_decode(reply, start)
data, reply[end:]
```

Look at what it did with the braces inside the `note` string: nothing. `raw_decode` is a real JSON
parser, so it knows a `}` inside a string doesn't end the object. That's why it beats the tempting
shortcut of slicing from the first `{` to the last `}`, which breaks as soon as the trailing note
contains a brace of its own.

A robust extractor tries `raw_decode` at each `{` in turn and returns the first one that parses to
an object. When none does, it raises, so the caller can decide what to do: retry, send the reply
back for repair (next lesson), or route the item to a person.

> [!WARNING]
> Don't "fix" model output with `str.replace("'", '"')` or `eval()`. The first corrupts any value
> containing an apostrophe (`"O'Brien"`), and the second runs whatever the model wrote as Python.
> Model output is untrusted input, exactly like a webhook body.

## Check why the model stopped

One failure isn't a formatting slip at all: the reply was cut off because it hit `max_tokens`.
The JSON is incomplete, and no amount of clever parsing will recover the missing fields. Your A2
client already reports it in `stop_reason`, so check it before you parse:

```python norun
response = llm.complete(messages, system=LEAD_SYSTEM, temperature=0, max_tokens=300)
if response.stop_reason == "max_tokens":
    raise ValueError("The reply was cut off at max_tokens; raise the limit or shorten the output")
lead = extract_json(response.text)
```

```quiz
question: A reply is cut off halfway through the JSON. What's the right response?
options:
  - "Close the open brackets and parse what's there"
  - "Parse the fields that are complete and leave the rest null"
  - "Treat it as a failure: raise, or retry with a higher max_tokens"
answer: 2
explain: A truncated object is missing data you asked for, and you can't tell which values were about to follow. Guessing turns a visible failure into silently wrong data in the CRM.
```

## Where this leaves you

Code can't act on prose, so ask for a JSON object with every field named, typed and allowed to be
null, and put the input between delimiters. Then expect the model to wrap it, introduce it, comment
on it or cut it off, and extract it with a parser that handles all of that and fails loudly when it
can't. The drills start with what `json.loads` really does, then build the extractor and the
request around it.
