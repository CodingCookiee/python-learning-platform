from plp import hidden, raises, test
from solution import advice


@test("Success, a client error and a server error")
def _():
    assert advice(201) == "done"
    assert advice(404) == "fix the request"
    assert advice(503) == "retry later"


@test("Credentials problems are called out")
def _():
    assert advice(401) == "check the credentials"
    assert advice(403) == "check the credentials"


@test("429 means slow down, not fix the request")
def _():
    assert advice(429) == "slow down and retry"


@test("Redirects")
def _():
    assert advice(301) == "follow the redirect"
    assert advice(304) == "follow the redirect"


@hidden("The edges of every range")
def _():
    assert advice(200) == "done"
    assert advice(299) == "done"
    assert advice(300) == "follow the redirect"
    assert advice(399) == "follow the redirect"
    assert advice(400) == "fix the request"
    assert advice(422) == "fix the request"
    assert advice(499) == "fix the request"
    assert advice(500) == "retry later"
    assert advice(599) == "retry later"


@hidden("Numbers that aren't a response status raise ValueError")
def _():
    raises(ValueError, advice, 100)
    raises(ValueError, advice, 600)
    raises(ValueError, advice, 0)
