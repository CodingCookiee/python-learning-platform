from slug import slugify


def test_lowercases_and_joins_words_with_a_hyphen():
    assert slugify("Hello World") == "hello-world"


# Next: a failing test for the next rule on the ticket. Then make it pass in slug.py.
