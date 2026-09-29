import base64

from plp import hidden, raises, test
from solution import basic_auth_header


@test("Encodes an account ID and token")
def _():
    assert basic_auth_header("AC8f2a", "sms-auth-token") == "Basic QUM4ZjJhOnNtcy1hdXRoLXRva2Vu"


@test("An empty password keeps its colon")
def _():
    assert basic_auth_header("sk_test_4eC39H", "") == "Basic c2tfdGVzdF80ZUMzOUg6"


@test("A colon in the password is fine")
def _():
    header = basic_auth_header("ops", "pa:ss:word")
    assert base64.b64decode(header.removeprefix("Basic ")) == b"ops:pa:ss:word"


@test("A colon in the username is refused")
def _():
    raises(ValueError, basic_auth_header, "ops:admin", "secret")


@hidden("Non-ASCII text is encoded as UTF-8")
def _():
    header = basic_auth_header("zoë", "contraseña")
    assert header.startswith("Basic ")
    assert base64.b64decode(header.removeprefix("Basic ")).decode("utf-8") == "zoë:contraseña"


@hidden("Matches what httpx sends")
def _():
    import httpx

    request = next(httpx.BasicAuth("AC8f2a", "p@ss wörd").auth_flow(httpx.Request("GET", "https://api.sms.example/")))
    assert basic_auth_header("AC8f2a", "p@ss wörd") == request.headers["authorization"]
