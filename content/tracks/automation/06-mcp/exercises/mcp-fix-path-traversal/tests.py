import json
import os
import tempfile
from pathlib import Path

from plp import hidden, test
from plp_fakes import McpHarness
from solution import HandbookServer

# A server folder: the handbook, plus files next to it that must never be served
BASE = Path(tempfile.mkdtemp(prefix="kiln_"))
ROOT = BASE / "handbook"
(ROOT / "teams").mkdir(parents=True)
(ROOT / "returns.md").write_text("# Returns\n\n30 days.", encoding="utf-8")
(ROOT / "teams" / "warehouse.md").write_text("# Warehouse\n\nDispatch closes at 15:00.", encoding="utf-8")
(ROOT / "teams" / "rota.csv").write_text("name,shift\nTom,early\n", encoding="utf-8")
SECRET = "KILN_SHOP_TOKEN=do-not-serve-this"
(BASE / "secrets.env").write_text(SECRET, encoding="utf-8")
(BASE / "handbook-archive").mkdir()
(BASE / "handbook-archive" / "old.md").write_text("# Old policy", encoding="utf-8")


def connected():
    client = McpHarness(HandbookServer(ROOT).handle)
    client.initialize()
    return client


def refused(client, uri):
    reply = client.request("resources/read", {"uri": uri})
    return "error" in reply and reply["error"]["code"] == -32602 and SECRET not in json.dumps(reply)


@test("Serves the handbook, and refuses ../secrets.env")
def _():
    client = connected()
    assert client.read_resource("handbook://returns.md")["contents"][0]["text"] == "# Returns\n\n30 days."
    assert refused(client, "handbook://../secrets.env"), "handbook://../secrets.env must be -32602 and must not leak the file"


@test("Pages in subfolders still work")
def _():
    assert connected().read_resource("handbook://teams/warehouse.md")["contents"] == [{
        "uri": "handbook://teams/warehouse.md", "mimeType": "text/markdown",
        "text": "# Warehouse\n\nDispatch closes at 15:00."}]


@test("Percent-encoded and deeper traversals are refused")
def _():
    client = connected()
    for uri in ["handbook://%2e%2e/secrets.env", "handbook://%2E%2E%2Fsecrets.env", "handbook://teams/../../secrets.env"]:
        assert refused(client, uri), f"{uri} must be refused"


@test("An absolute path is refused")
def _():
    assert refused(connected(), "handbook://" + str(BASE / "secrets.env"))


@hidden("A sibling folder whose name starts with the root's name is outside it")
def _():
    assert refused(connected(), "handbook://../handbook-archive/old.md")


@hidden("Only markdown files, not folders or other files inside the root")
def _():
    client = connected()
    assert refused(client, "handbook://teams/rota.csv")
    assert refused(client, "handbook://teams")
    assert refused(client, "handbook://missing.md")


@hidden("A symlink that points out of the handbook is refused")
def _():
    link = ROOT / "leak.md"
    try:
        if not link.exists():
            os.symlink(BASE / "secrets.env", link)
    except (OSError, NotImplementedError):
        return                                   # no symlinks on this file system: nothing to check
    try:
        assert refused(connected(), "handbook://leak.md")
    finally:
        link.unlink()
