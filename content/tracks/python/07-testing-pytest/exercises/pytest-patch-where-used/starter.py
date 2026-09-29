from unittest.mock import ANY, patch

import pytest

from signup import register


def test_register_sends_a_welcome_email():
    with patch("mailer.send_email") as send_email:
        register("ada@example.com")
    send_email.assert_called_once_with("ada@example.com", "Welcome to Harbour Books", ANY)


def test_the_welcome_goes_to_the_cleaned_up_address():
    with patch("mailer.send_email") as send_email:
        register("  Grace@Example.com ")
    assert send_email.call_args.args[0] == "grace@example.com"


def test_an_invalid_address_gets_no_email():
    with patch("mailer.send_email") as send_email:
        with pytest.raises(ValueError):
            register("not-an-email")
    send_email.assert_not_called()
