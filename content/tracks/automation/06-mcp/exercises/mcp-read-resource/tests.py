import base64

from plp import hidden, test
from plp_fakes import McpHarness
from solution import handle


def connected():
    return McpHarness(handle, protocol="2026-07-28")


@test("Reads the returns policy as markdown text")
def _():
    assert connected().read_resource("policy://returns") == {"resultType": "complete", "contents": [{
        "uri": "policy://returns", "mimeType": "text/markdown",
        "text": "# Returns\n\nUnused items can be returned within 30 days of delivery."}]}


@test("Lists every document with its size in bytes")
def _():
    assert connected().list_resources() == [
        {"uri": "policy://returns", "name": "returns", "title": "Returns policy", "mimeType": "text/markdown", "size": 67},
        {"uri": "policy://shipping", "name": "shipping", "title": "Shipping policy", "mimeType": "text/markdown", "size": 78},
        {"uri": "wiki://brand/logo", "name": "logo", "title": "Kiln & Co logo", "mimeType": "image/png", "size": 19},
    ]


@test("Binary content is a base64 blob")
def _():
    item = connected().read_resource("wiki://brand/logo")["contents"][0]
    assert set(item) == {"uri", "mimeType", "blob"}
    assert item["mimeType"] == "image/png"
    assert base64.b64decode(item["blob"]) == b"\x89PNG\r\n\x1a\n-kiln-logo-"


@test("Lists the person template, and reads a page through it")
def _():
    client = connected()
    assert client.list_resource_templates() == [{
        "uriTemplate": "wiki://people/{handle}", "name": "person", "title": "Staff profile", "mimeType": "text/markdown"}]
    assert client.read_resource("wiki://people/ada")["contents"] == [{
        "uri": "wiki://people/ada", "mimeType": "text/markdown",
        "text": "# Ada Obi\n\nSupport lead. Ask about: refunds, damaged items."}]


@test("A missing resource is -32602 with the URI in data")
def _():
    reply = connected().request("resources/read", {"uri": "policy://refunds"})
    assert reply["error"] == {"code": -32602, "message": "Resource not found: policy://refunds",
                              "data": {"uri": "policy://refunds"}}


@hidden("Unknown people, and URIs that only nearly match the template, are not found")
def _():
    client = connected()
    for uri in ["wiki://people/zoe", "wiki://people/ada/photo", "wiki://people/"]:
        assert client.request("resources/read", {"uri": uri})["error"]["data"] == {"uri": uri}


@hidden("A missing or non-string uri is invalid params")
def _():
    client = connected()
    assert client.request("resources/read", {})["error"] == {"code": -32602, "message": "Invalid params: uri is required"}
    assert client.request("resources/read", {"uri": ["policy://returns"]})["error"]["code"] == -32602
