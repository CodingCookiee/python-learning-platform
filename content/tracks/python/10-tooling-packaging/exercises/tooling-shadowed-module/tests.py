from plp import test, hidden
from solution import resolve_import

SEARCH_PATH = ["/home/ada/lottery", "/usr/lib/python3.14"]
LISTING = {
    "/home/ada/lottery": {"main.py", "random.py"},
    "/usr/lib/python3.14": {"random.py", "json/__init__.py", "json/decoder.py"},
}


@test("The project's own random.py shadows the standard library")
def _():
    assert resolve_import("random", SEARCH_PATH, LISTING) == "/home/ada/lottery/random.py"
    assert resolve_import("json.decoder", SEARCH_PATH, LISTING) == "/usr/lib/python3.14/json/decoder.py"


@test("Falls through to later folders, and returns None when nothing matches")
def _():
    assert resolve_import("json", SEARCH_PATH, LISTING) == "/usr/lib/python3.14/json/__init__.py"
    assert resolve_import("httpx", SEARCH_PATH, LISTING) is None


@test("A package beats a module of the same name in the same folder")
def _():
    listing = {"/srv/app": {"invoicer.py", "invoicer/__init__.py"}}
    assert resolve_import("invoicer", ["/srv/app"], listing) == "/srv/app/invoicer/__init__.py"


@test("Finds submodules and subpackages")
def _():
    site = "/home/ada/invoicer/.venv/lib/python3.14/site-packages"
    listing = {
        site: {
            "httpx/__init__.py",
            "httpx/_client.py",
            "httpx/_transports/__init__.py",
            "httpx/_transports/default.py",
        }
    }
    assert resolve_import("httpx._client", [site], listing) == f"{site}/httpx/_client.py"
    assert resolve_import("httpx._transports.default", [site], listing) == f"{site}/httpx/_transports/default.py"


@hidden("Submodules are only searched inside the package that was found")
def _():
    listing = {
        "/home/ada/lottery": {"json/__init__.py"},
        "/usr/lib/python3.14": {"json/__init__.py", "json/decoder.py"},
    }
    assert resolve_import("json.decoder", SEARCH_PATH, listing) is None


@hidden("A plain module has no submodules")
def _():
    assert resolve_import("random.helpers", SEARCH_PATH, LISTING) is None


@hidden("Folders missing from the listing are empty")
def _():
    assert resolve_import("random", ["/nowhere", "/usr/lib/python3.14"], LISTING) == "/usr/lib/python3.14/random.py"
