import pytest

import accounts


@pytest.fixture
def account():
    account = accounts.create_account("ada@example.com")
    yield account
    accounts.delete_account(account.id)


def test_new_accounts_start_on_the_free_plan(account):
    assert account.plan == "free"


def test_find_ignores_case_and_spaces(account):
    assert accounts.find("  ADA@Example.com ") == account


def test_change_plan_is_stored(account):
    accounts.change_plan(account.id, "pro")
    assert accounts.find("ada@example.com").plan == "pro"


def test_emails_are_stored_trimmed_and_lowercased():
    account = accounts.create_account("  Grace@Example.COM ")
    try:
        assert account.email == "grace@example.com"
    finally:
        accounts.delete_account(account.id)
