from strength import password_strength


def test_short_password_is_weak():
    result = password_strength("ab1!")
    assert result == "weak"


def test_seven_characters_is_weak():
    result = password_strength("abcde1!")
    assert result == "weak"


def test_letters_only_is_weak():
    result = password_strength("abcdefgh")
    assert result == "weak"


def test_letters_and_digits_is_medium():
    result = password_strength("abcdefg1")
    assert result == "medium"


def test_letters_and_symbols_is_medium():
    result = password_strength("abcdefg!")
    assert result == "medium"


def test_letters_digits_and_symbols_is_strong():
    result = password_strength("abcdef1!")
    assert result == "strong"
