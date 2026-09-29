from plp import test, hidden
from solution import read_pyvenv_cfg

UV_CFG = """home = /usr/local/bin
implementation = CPython
uv = 0.9.2
version_info = 3.14.0
include-system-site-packages = false
prompt = invoicer
"""


@test("Reads the file uv writes")
def _():
    assert read_pyvenv_cfg(UV_CFG) == {
        "home": "/usr/local/bin",
        "implementation": "CPython",
        "uv": "0.9.2",
        "version_info": "3.14.0",
        "include-system-site-packages": False,
        "prompt": "invoicer",
    }


@test("Skips blank lines")
def _():
    text = "home = /usr/bin\n\ninclude-system-site-packages = false\n\n"
    assert read_pyvenv_cfg(text) == {"home": "/usr/bin", "include-system-site-packages": False}


@test("Keeps an = inside a value")
def _():
    text = (
        "home = /usr/bin\n"
        "include-system-site-packages = false\n"
        "command = /usr/bin/python3 -m venv --prompt=invoicer /home/ada/invoicer/.venv\n"
    )
    assert read_pyvenv_cfg(text)["command"] == "/usr/bin/python3 -m venv --prompt=invoicer /home/ada/invoicer/.venv"


@test("\"false\" is False and \"true\" is True")
def _():
    assert read_pyvenv_cfg("include-system-site-packages = false")["include-system-site-packages"] is False
    assert read_pyvenv_cfg("include-system-site-packages = true")["include-system-site-packages"] is True


@hidden("Treats a missing flag as False, and ignores case")
def _():
    assert read_pyvenv_cfg("home = /opt/python/bin\nversion = 3.12.4") == {
        "home": "/opt/python/bin",
        "version": "3.12.4",
        "include-system-site-packages": False,
    }
    assert read_pyvenv_cfg("include-system-site-packages = True")["include-system-site-packages"] is True


@hidden("Handles no spaces around the =")
def _():
    assert read_pyvenv_cfg("home=/usr/bin\ninclude-system-site-packages=false") == {
        "home": "/usr/bin",
        "include-system-site-packages": False,
    }
