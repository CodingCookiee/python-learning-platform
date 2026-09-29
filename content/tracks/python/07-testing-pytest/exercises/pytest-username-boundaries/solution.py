from signup import is_valid_username


def test_accepts_a_typical_username():
    assert is_valid_username("ada_lovelace")


def test_accepts_the_shortest_allowed_length():
    assert is_valid_username("abc")


def test_rejects_a_name_one_character_too_short():
    assert not is_valid_username("ab")


def test_accepts_the_longest_allowed_length():
    assert is_valid_username("a" * 15)


def test_rejects_a_name_one_character_too_long():
    assert not is_valid_username("a" * 16)


def test_rejects_a_leading_digit():
    assert not is_valid_username("7eleven")


def test_accepts_digits_and_underscores_after_the_first_letter():
    assert is_valid_username("ada_1815")


def test_rejects_other_characters():
    assert not is_valid_username("ada-lovelace")
    assert not is_valid_username("ada lovelace")
