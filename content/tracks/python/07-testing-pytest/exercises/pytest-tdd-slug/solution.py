from slug import slugify


def test_lowercases_and_joins_words_with_a_hyphen():
    assert slugify("Hello World") == "hello-world"


def test_a_run_of_punctuation_becomes_one_hyphen():
    assert slugify("Hello, World!") == "hello-world"


def test_no_hyphens_at_the_ends():
    assert slugify("  ...Python 3.13?  ") == "python-3-13"


def test_long_slugs_keep_whole_words():
    assert slugify("ten tips for writing tests", max_length=15) == "ten-tips-for"


def test_a_word_that_ends_on_the_limit_is_kept():
    assert slugify("ten tips for writing tests", max_length=20) == "ten-tips-for-writing"


def test_one_long_word_is_cut_at_the_limit():
    assert slugify("a" * 50) == "a" * 40


def test_nothing_usable_gives_untitled():
    assert slugify("!!!") == "untitled"
