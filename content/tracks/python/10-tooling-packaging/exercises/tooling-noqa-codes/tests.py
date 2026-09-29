from plp import test, hidden
from solution import suppressed


@test("Silences only the codes it lists")
def _():
    assert suppressed("    except:  # noqa: E722", "E722") is True
    assert suppressed("    except:  # noqa: E722", "F401") is False
    assert suppressed("import os  # noqa", "F401") is True
    assert suppressed("import os", "F401") is False


@test("Reads several codes, however they're separated")
def _():
    line = "from invoicer import *  # noqa: F401,F403"
    assert suppressed(line, "F401") is True
    assert suppressed(line, "F403") is True
    assert suppressed("x == None  # noqa: E711 E712", "E712") is True
    assert suppressed("x == None  # noqa: E711, E712", "E711") is True


@test("Codes must match exactly")
def _():
    assert suppressed("    except:  # noqa: E72", "E722") is False
    assert suppressed("    except:  # noqa: E7221", "E722") is False


@hidden("Ignores the explanation after the codes")
def _():
    line = "    except:  # noqa: E722 (plugins can raise anything)"
    assert suppressed(line, "E722") is True
    assert suppressed(line, "F401") is False


@hidden("Accepts any case and no space after #")
def _():
    assert suppressed("import os  #NOQA", "F401") is True
    assert suppressed("import os  # NoQA:F401", "F401") is True
    assert suppressed("import os  # NoQA:F401", "E501") is False
