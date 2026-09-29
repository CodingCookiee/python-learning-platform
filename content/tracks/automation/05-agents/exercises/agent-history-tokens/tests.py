import json

from plp import hidden, test
from solution import history_tokens

CALLS = [{"id": "c1", "name": "get_account", "arguments": {"account_id": "C-301"}}]
CONVERSATION = [
    {"role": "user", "content": "Our CSV export has failed since Monday."},
    {"role": "assistant", "content": "", "tool_calls": CALLS},
    {"role": "tool", "tool_call_id": "c1", "content": '{"plan": "growth", "exports_this_month": 14}'},
    {"role": "assistant", "content": "I can see 14 exports this month. Which one failed?"},
]


@test("Counts the example message")
def _():
    assert history_tokens([{"role": "user", "content": "Our CSV export has failed since Monday."}]) == 10


@test("Counts every message, including tool calls")
def _():
    assert history_tokens(CONVERSATION) == 10 + 19 + 11 + 13


@test("Adds the system prompt")
def _():
    system = "You are Northwind's support agent."
    assert history_tokens(CONVERSATION, system=system) == history_tokens(CONVERSATION) + 9


@hidden("Copes with None content, and an empty history")
def _():
    assert history_tokens([{"role": "assistant", "content": None, "tool_calls": CALLS}]) == 19
    assert history_tokens([]) == 0
