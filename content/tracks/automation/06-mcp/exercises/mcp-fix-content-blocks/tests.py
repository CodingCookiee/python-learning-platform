import json

from plp import hidden, test
from solution import result_to_text


@test("Joins a text block and a resource link")
def _():
    assert result_to_text({"content": [{"type": "text", "text": "Returns: 30 days."},
                                       {"type": "resource_link", "uri": "policy://returns", "name": "returns"}]}) == (
        "Returns: 30 days.\n[resource: policy://returns]")


@test("A single text block is unchanged")
def _():
    assert result_to_text({"content": [{"type": "text", "text": '{"status": "shipped"}'}], "isError": False}) == (
        '{"status": "shipped"}')


@test("A failed call becomes an error object")
def _():
    text = result_to_text({"content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True})
    assert json.loads(text) == {"error": "Order 9999 not found"}


@test("Every search hit is kept, even when a link comes first")
def _():
    result = {"content": [
        {"type": "resource_link", "uri": "wiki://handbook/returns", "name": "returns"},
        {"type": "text", "text": "Unused items: 30 days."},
        {"type": "text", "text": "Damaged items: refund or replacement."},
    ]}
    assert result_to_text(result) == (
        "[resource: wiki://handbook/returns]\nUnused items: 30 days.\nDamaged items: refund or replacement.")


@hidden("Images, audio, embedded resources and unknown blocks")
def _():
    result = {"content": [
        {"type": "image", "data": "iVBORw0KGgo=", "mimeType": "image/png"},
        {"type": "audio", "data": "UklGRg==", "mimeType": "audio/wav"},
        {"type": "resource", "resource": {"uri": "policy://returns", "mimeType": "text/markdown", "text": "# Returns"}},
        {"type": "resource", "resource": {"uri": "wiki://brand/logo", "mimeType": "image/png", "blob": "iVBO"}},
        {"type": "video", "uri": "x"},
    ]}
    assert result_to_text(result).split("\n") == [
        "[image: image/png]", "[audio: audio/wav]", "# Returns", "[resource: wiki://brand/logo]", "[video content]"]


@hidden("No content: structured content as JSON, or an empty string")
def _():
    assert json.loads(result_to_text({"content": [], "structuredContent": {"times": ["14:30"]}})) == {"times": ["14:30"]}
    assert result_to_text({"structuredContent": {"ok": True}}) == '{"ok": true}'
    assert result_to_text({"content": []}) == ""
    assert json.loads(result_to_text({"content": [], "isError": True})) == {"error": ""}
