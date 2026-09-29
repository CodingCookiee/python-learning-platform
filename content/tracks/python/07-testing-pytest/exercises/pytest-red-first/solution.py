from coupons import discount_percent


def test_known_code_gets_its_discount():
    assert discount_percent("SAVE10") == 10


def test_codes_are_not_case_sensitive():
    assert discount_percent("save10") == 10
    assert discount_percent(" Spring25 ") == 25


def test_unknown_code_gets_no_discount():
    assert discount_percent("WINTER99") == 0
