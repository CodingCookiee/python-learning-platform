---
slug: evaluating-rag
title: Evaluating retrieval and answers
summary: Build a labelled question set, measure retrieval with recall@k and MRR, check answers for correct citations, faithfulness and refusals, and gate every change on a regression check.
minutes: 50
exercises:
  - rag-predict-recall-mrr
  - rag-recall-and-mrr
  - rag-citation-accuracy
  - rag-faithfulness-judge
  - rag-regression-gate
---

Ledgerline's support bot has been live for a month, and someone suggests halving the chunk size
"because smaller chunks are more precise". Is that better? You can try ten questions by hand and
get a feeling, or you can run 60 labelled questions through both versions and get two numbers.
The second is how you make changes to a RAG system without breaking it, and how you show a client
that it works. This lesson builds the measurements, retrieval first, then answers.

## A labelled question set

An eval set is a list of real questions, each labelled with the chunks that answer it:

```python
questions = [
    {"id": "q01", "question": "Can I change my invoice number prefix?", "relevant": ["invoices.md#1"]},
    {"id": "q02", "question": "Why do I get error E-4012 exporting to Xero?", "relevant": ["errors.md#4", "xero.md#2"]},
    {"id": "q03", "question": "When do payment reminders go out?", "relevant": ["reminders.md#0"]},
    {"id": "q04", "question": "Do you integrate with SAP?", "relevant": []},   # not in the docs: should be refused
]
answerable = [q for q in questions if q["relevant"]]
len(questions), len(answerable)
```

Where the questions come from matters more than how many there are:

- **Real questions**, from support tickets, chat logs or the client's FAQ requests, phrased the way
  customers phrase them, typos included. Questions you invent after reading the docs use the docs'
  own words and flatter keyword search.
- **Labels from someone who knows the answer**: the client's support lead, working from a
  spreadsheet of questions and chunk ids. Your chunk ids must be stable (lesson 2) or the labels
  rot the first time you re-chunk.
- **Unanswerable questions** too, about 10 to 20% of the set, to check the bot refuses.
- **Start with 30 to 50.** That's enough to see big differences. Grow it every time a real user
  finds a failure: that question goes in the set, so it can't break again unnoticed.

## Recall@k

Retrieval's job is to put the relevant chunks in front of the model. **Recall@k** is the fraction
of a question's relevant chunks that appear in the top `k` results, averaged over the answerable
questions:

```python
retrieved = {
    "q01": ["invoices.md#1", "invoices.md#0", "tax.md#2"],
    "q02": ["xero.md#0", "xero.md#2", "csv.md#1"],
    "q03": ["tax.md#0", "invoices.md#3", "reminders.md#1"],
}
relevant = {"q01": {"invoices.md#1"}, "q02": {"errors.md#4", "xero.md#2"}, "q03": {"reminders.md#0"}}

def recall_at_k(k):
    per_question = [len(relevant[q] & set(retrieved[q][:k])) / len(relevant[q]) for q in retrieved]
    return round(sum(per_question) / len(per_question), 3)

recall_at_k(1), recall_at_k(3)
```

q01 is perfect, q02 found one of its two chunks, and q03 found nothing, which is the one to look at
first. Choose `k` to match what your pipeline shows the model: recall@5 if the prompt gets five
chunks. Recall@20 against recall@5 tells you whether a reranker could help (lesson 5). Some teams
report **hit rate@k** instead, the fraction of questions with *at least one* relevant chunk in the
top k; with one relevant chunk per question, the two are the same.

## MRR: how high the first good result is

Recall ignores order: a relevant chunk at position 5 counts the same as one at position 1. **Mean
reciprocal rank** rewards putting it first. For each question, take 1 divided by the rank of the
first relevant result (0 if none is found), then average:

```python
retrieved = {
    "q01": ["invoices.md#1", "invoices.md#0", "tax.md#2"],
    "q02": ["xero.md#0", "xero.md#2", "csv.md#1"],
    "q03": ["tax.md#0", "invoices.md#3", "reminders.md#1"],
}
relevant = {"q01": {"invoices.md#1"}, "q02": {"errors.md#4", "xero.md#2"}, "q03": {"reminders.md#0"}}

def reciprocal_rank(results, wanted):
    for rank, chunk_id in enumerate(results, start=1):
        if chunk_id in wanted:
            return 1 / rank
    return 0.0

ranks = {q: reciprocal_rank(retrieved[q], relevant[q]) for q in retrieved}
ranks, round(sum(ranks.values()) / len(ranks), 3)
```

An MRR of 0.5 means "on average the first good chunk is about second". Track both numbers: recall
says whether the answer is findable at all, MRR whether it's near the top, which matters for
reranking and for how much context you can afford.

```quiz
question: After halving the chunk size, recall@5 goes from 0.84 to 0.91 and MRR from 0.71 to 0.62. What does that tell you?
options:
  - "The change is worse on both counts"
  - "More questions now have a relevant chunk in the top five, but it tends to sit lower, so the change probably needs a reranker or a larger k to pay off"
  - "Nothing: the numbers move in opposite directions, so they cancel out"
answer: 1
explain: Smaller chunks made more answers findable (recall up) but split them into pieces that rank lower (MRR down). Whether that's better depends on what follows retrieval; the numbers tell you where to look, which is their job.
```

## Evaluating the answers

Good retrieval doesn't guarantee a good answer. Four checks cover most of what goes wrong, and
the first three are plain code:

- **Citation validity**: every cited chunk is one the model was actually given.
- **Citation correctness**: at least one cited chunk is labelled relevant for the question.
- **Refusal correctness**: answerable questions are answered, unanswerable ones refused.
- **Faithfulness**: every claim in the answer is supported by the sources, not invented or
  "remembered" from training. That needs reading, so it's done with an **LLM as judge**: a second
  call that gets the sources and the answer and lists any unsupported claims.

```python
case = {"answerable": True, "relevant": ["invoices.md#1"], "given": ["invoices.md#1", "tax.md#2"],
        "cited": ["tax.md#2", "pricing.md#0"], "refused": False}

problems = []
if case["answerable"] and case["refused"]:
    problems.append("refused an answerable question")
for chunk_id in case["cited"]:
    if chunk_id not in case["given"]:
        problems.append(f"cited {chunk_id}, which it wasn't given")
if case["answerable"] and not case["refused"] and not set(case["cited"]) & set(case["relevant"]):
    problems.append("none of its citations are relevant")
problems
```

A judge is a model too, so treat its verdicts as a measurement with error: use a strong model at
temperature 0, give it a narrow question ("list claims the sources don't support"), have a person
check a sample of its verdicts against their own, and never let an unreadable judge reply count as
a pass.

## Regression thinking

The point of an eval is to run it on every change: chunk size, embedding model, prompt, `k`,
reranker. Keep each run's per-question results, not just the averages, and compare runs question
by question:

```python
baseline = {"q01": 1, "q02": 2, "q03": None, "q05": 1, "q06": 3}   # rank of first relevant chunk, None if missed
current = {"q01": 1, "q02": None, "q03": 2, "q05": 1, "q06": 1}

regressed = sorted(q for q in baseline if baseline[q] is not None and current[q] is None)
fixed = sorted(q for q in baseline if baseline[q] is None and current[q] is not None)
hit = lambda run: sum(rank is not None for rank in run.values()) / len(run)
hit(baseline), hit(current), regressed, fixed
```

The averages are identical, 0.8 both times, and hide that q02 broke and q03 was fixed. If q02 is
"how do I get a VAT invoice", the client cares. So a regression gate checks both: the averages
may not drop by more than a small tolerance (small eval sets are noisy), and questions marked
critical may never regress. Run it in CI, like the test suite from module 7; A7 builds this out
into full eval pipelines.

## Where this leaves you

Label real questions with stable chunk ids, including some the docs can't answer. Measure
retrieval with recall@k (is the answer findable?) and MRR (how high is it?). Check answers with
code for citation validity, citation correctness and refusals, and with a judge model for
faithfulness, treating judge failures as failures. Keep per-question results and gate changes on
both averages and critical questions. The drills predict recall and MRR, compute them over a
question set, grade answers' citations, write a faithfulness judge, and build the regression gate.
