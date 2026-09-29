import pytest

import accounts


@pytest.fixture
def account():
    return accounts.create_account("ada@example.com")


def test_new_accounts_start_on_the_free_plan(account):
    assert account.plan == "free"
