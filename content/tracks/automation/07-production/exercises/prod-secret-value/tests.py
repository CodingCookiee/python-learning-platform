import logging
from dataclasses import dataclass

from plp import captured_logs, hidden, raises, test
from solution import Secret, secret_from_env

ENV = {"ANTHROPIC_API_KEY": "sk-ant-test-4f9a", "BLANK": "   "}


@test("Masks the example's key and still reveals it on request")
def _():
    key = secret_from_env(ENV, "ANTHROPIC_API_KEY")
    assert f"Using key {key}" == "Using key **********"
    assert repr({"model": "claude-haiku-4-5", "key": key}) == "{'model': 'claude-haiku-4-5', 'key': Secret('**********')}"
    assert key.reveal() == "sk-ant-test-4f9a"


@test("A missing or blank variable raises RuntimeError naming it")
def _():
    raises(RuntimeError, secret_from_env, ENV, "OPENAI_API_KEY", match="OPENAI_API_KEY")
    raises(RuntimeError, secret_from_env, ENV, "BLANK", match="BLANK")


@test("Masked in dataclasses and in log lines")
def _():
    @dataclass
    class Settings:
        model: str
        api_key: Secret

    settings = Settings("claude-haiku-4-5", Secret("sk-ant-test-4f9a"))
    with captured_logs() as logs:
        logging.getLogger("invoice-extractor").warning("Starting with %s", settings)
    assert "sk-ant-test-4f9a" not in logs.text
    assert "4f9a" not in repr(settings)


@hidden("Equality compares the values, and str() is the bare mask")
def _():
    assert Secret("sk-ant-test-4f9a") == Secret("sk-ant-test-4f9a")
    assert Secret("sk-ant-test-4f9a") != Secret("sk-ant-test-0000")
    assert str(Secret("sk-ant-test-4f9a")) == "**********"
    assert repr([Secret("hunter2-db-password")]) == "[Secret('**********')]"
