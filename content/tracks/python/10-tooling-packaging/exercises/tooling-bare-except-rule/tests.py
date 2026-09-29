from plp import test, hidden
from solution import find_bare_excepts

MESSAGE = "E722 Do not use bare `except`"

SETTINGS = """import json

def load_settings(text):
    try:
        return json.loads(text)
    except:
        return {}
"""


@test("Finds the bare except in load_settings")
def _():
    assert find_bare_excepts(SETTINGS) == [f"6:5: {MESSAGE}"]


@test("Ignores clauses that name an exception")
def _():
    source = """try:
    total = int(raw)
except ValueError:
    total = 0
except (TypeError, KeyError) as error:
    raise
except Exception:
    pass
"""
    assert find_bare_excepts(source) == []


@test("Finds nested clauses, in source order")
def _():
    source = """class Importer:
    def run(self, rows):
        for row in rows:
            try:
                self.save(row)
            except:
                try:
                    self.log(row)
                except:
                    pass
        try:
            self.commit()
        except OSError:
            pass
        except:
            self.rollback()
"""
    assert find_bare_excepts(source) == [f"6:13: {MESSAGE}", f"9:17: {MESSAGE}", f"15:9: {MESSAGE}"]


@hidden("Doesn't run the code it checks")
def _():
    source = "raise SystemExit('this would stop everything')\ntry:\n    pass\nexcept:\n    pass\n"
    assert find_bare_excepts(source) == [f"4:1: {MESSAGE}"]


@hidden("Code without any try has no findings")
def _():
    assert find_bare_excepts("def add(a, b):\n    return a + b\n") == []
