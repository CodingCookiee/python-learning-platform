from signup import is_valid_username


def test_accepts_a_typical_username():
    assert is_valid_username("ada_lovelace")


# Test the edges of each rule: the length limits, the first character, the allowed characters
