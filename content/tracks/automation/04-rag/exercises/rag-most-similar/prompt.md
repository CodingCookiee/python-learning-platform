Harbour Physio's website has a list of FAQ entries, and the new chat widget should suggest the
closest ones to whatever a patient types. Write `most_similar(question, faqs, embed, k=3)`.

- `embed` takes a list of texts and returns a list of vectors (in the tests, the course's
  `fake_embed`). Call it **exactly once**, with the question first and then every FAQ, in order.
  Don't assume the vectors are normalised.
- Return up to `k` pairs `(faq, score)`, most similar first, where `score` is the cosine
  similarity as a plain `float`. Equal scores keep the FAQs' original order.
- With no FAQs, return `[]` without calling `embed`.

```python
faqs = [
    "How do I cancel an appointment? Call reception at least 24 hours before your appointment.",
    "What does a first physiotherapy assessment cost? A first assessment costs 65 pounds.",
    "Is there parking at the clinic? There is free parking behind the clinic.",
]
most_similar("How much does an assessment cost?", faqs, fake_embed, k=2)
# [("What does a first physiotherapy assessment cost? ...", 0.539...),
#  ("Is there parking at the clinic? ...", 0.234...)]
```
