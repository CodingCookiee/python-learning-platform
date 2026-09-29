from coupons import discount_percent


def test_known_code_gets_its_discount():
    assert discount_percent("SAVE10") == 10


# Add a test that reproduces the bug report
