import numpy as np


def most_similar(question, faqs, embed, k=3):
    """The k FAQ entries closest to the question, as (faq, cosine score) pairs, best first."""
    results = []
    for faq in faqs:
        [question_vector] = embed([question])
        [faq_vector] = embed([faq])
        score = np.dot(question_vector, faq_vector)
        results.append((faq, score))
    return results[:k]
