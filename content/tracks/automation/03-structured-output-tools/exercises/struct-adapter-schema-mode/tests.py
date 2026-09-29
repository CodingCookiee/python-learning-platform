from plp import hidden, raises, test
from solution import Refused, schema_options, structured_text

SCHEMA = {
    "title": "Ticket",
    "type": "object",
    "properties": {"category": {"type": "string"}},
    "required": ["category"],
    "additionalProperties": False,
}
TICKET_JSON = '{"category": "shipping"}'


@test("Builds the example's OpenAI options and reads an Anthropic reply")
def _():
    assert schema_options("openai", SCHEMA) == {
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "Ticket", "strict": True, "schema": SCHEMA},
        }
    }
    body = {"content": [{"type": "text", "text": TICKET_JSON}], "stop_reason": "end_turn"}
    assert structured_text("anthropic", body) == TICKET_JSON


@test("Builds Anthropic's output_config")
def _():
    assert schema_options("anthropic", SCHEMA) == {
        "output_config": {"format": {"type": "json_schema", "schema": SCHEMA}}
    }


@test("Reads an OpenAI reply")
def _():
    body = {"choices": [{"index": 0, "message": {"role": "assistant", "content": TICKET_JSON, "refusal": None},
                         "finish_reason": "stop"}]}
    assert structured_text("openai", body) == TICKET_JSON


@test("Raises Refused when either provider declines")
def _():
    body = {"choices": [{"message": {"role": "assistant", "content": None,
                                     "refusal": "I can't help with that request."}}]}
    raises(Refused, structured_text, "openai", body, match="can't help")
    raises(Refused, structured_text, "anthropic", {"content": [], "stop_reason": "refusal"})


@hidden("Names an untitled schema 'output', and refuses unknown providers")
def _():
    untitled = {key: value for key, value in SCHEMA.items() if key != "title"}
    assert schema_options("openai", untitled)["response_format"]["json_schema"]["name"] == "output"
    raises(ValueError, schema_options, "gemini", SCHEMA)
    raises(ValueError, structured_text, "gemini", {})


@hidden("Joins several Anthropic text blocks and skips other block types")
def _():
    body = {
        "content": [
            {"type": "thinking", "thinking": ""},
            {"type": "text", "text": '{"category": '},
            {"type": "text", "text": '"billing"}'},
        ],
        "stop_reason": "end_turn",
    }
    assert structured_text("anthropic", body) == '{"category": "billing"}'
