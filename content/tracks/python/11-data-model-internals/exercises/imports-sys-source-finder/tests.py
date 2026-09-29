import contextlib
import importlib
import sys

from plp import test, hidden, raises
from solution import SourceFinder

SHOP = {
    "shop": "",
    "shop.pricing": "VAT = 0.2\n\ndef gross(net):\n    return round(net * (1 + VAT), 2)\n",
    "shop.pricing.rules": "from shop.pricing import gross\n\ndef member_price(net):\n    return round(gross(net) * 0.9, 2)\n",
    "banner": "print('loading banner')\nTEXT = 'Spring sale'\n",
}


@contextlib.contextmanager
def installed(finder):
    """Put finder first on sys.meta_path, and clean up every module it served."""
    names = list(finder.sources)
    for name in names:
        sys.modules.pop(name, None)
    sys.meta_path.insert(0, finder)
    try:
        yield finder
    finally:
        if finder in sys.meta_path:
            sys.meta_path.remove(finder)
        for name in names:
            sys.modules.pop(name, None)


@test("Imports a package and a module from the dict")
def _():
    with installed(SourceFinder(SHOP)) as finder:
        import shop.pricing
        assert shop.pricing.gross(50) == 60.0
        assert shop.pricing.__spec__.loader is finder
        import json
        assert json.dumps([1]) == "[1]"


@test("find_spec answers only for names it has")
def _():
    finder = SourceFinder(SHOP)
    spec = finder.find_spec("banner", None)
    assert spec.name == "banner"
    assert spec.loader is finder
    assert finder.find_spec("json", None) is None
    assert finder.find_spec("shop.shipping", None) is None


@test("Packages are recognised from their submodules")
def _():
    finder = SourceFinder(SHOP)
    assert finder.find_spec("shop", None).submodule_search_locations is not None
    assert finder.find_spec("shop.pricing", None).submodule_search_locations is not None
    assert finder.find_spec("banner", None).submodule_search_locations is None


@hidden("Nested imports, the module cache and missing names")
def _():
    with installed(SourceFinder(SHOP)):
        rules = importlib.import_module("shop.pricing.rules")
        assert rules.member_price(50) == 54.0
        assert sys.modules["shop.pricing"].VAT == 0.2
        raises(ModuleNotFoundError, importlib.import_module, "shop.shipping")


@hidden("Each module runs once, through the normal cache")
def _():
    with installed(SourceFinder(SHOP)):
        first = importlib.import_module("banner")
        second = importlib.import_module("banner")
        assert first is second
        assert first.TEXT == "Spring sale"
        assert first.__name__ == "banner"
