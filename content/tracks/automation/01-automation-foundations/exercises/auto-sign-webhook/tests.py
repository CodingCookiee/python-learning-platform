from plp import hidden, test
from solution import sign_webhook


@test("Signs a lead event")
def _():
    assert sign_webhook("test-secret-agency", 1773072000, b'{"id":"evt_1042","type":"lead.created"}') == (
        "t=1773072000,v1=166aabaff8fd6e846db23e08e70c60d4bf72fd2539d3297e94db249333cc704d"
    )


@test("Signs an empty body")
def _():
    assert sign_webhook("test-secret-agency", 1773072000, b"") == (
        "t=1773072000,v1=1d86ca8ef954e57471b918b1370cb2e13b17236e747338c5fdce92523771d1f8"
    )


@test("A different secret and timestamp give a different signature")
def _():
    assert sign_webhook("another-test-secret", 1773075600, b'{"id": "evt_2001"}') == (
        "t=1773075600,v1=fd7bbbbd3e897431fbffe2f27a25cc6ceb6b6ee1d80cbee10f21d549f266c635"
    )


@hidden("Changing one byte of the body changes the signature")
def _():
    a = sign_webhook("test-secret-agency", 1773072000, b'{"amount":100}')
    b = sign_webhook("test-secret-agency", 1773072000, b'{"amount":900}')
    assert a != b
    assert a.startswith("t=1773072000,v1=") and len(a) == len("t=1773072000,v1=") + 64
