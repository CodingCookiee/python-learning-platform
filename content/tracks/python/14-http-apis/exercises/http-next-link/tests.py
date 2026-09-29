import httpx

from plp import hidden, test
from solution import next_page_url

REPOS = "https://api.github.com/orgs/acme/repos"


def page(link=None, url=REPOS):
    headers = {"Link": link} if link else {}
    return httpx.Response(200, json=[], headers=headers, request=httpx.Request("GET", url))


@test("Finds the next link among several")
def _():
    response = page(f'<{REPOS}?page=2>; rel="next", <{REPOS}?page=5>; rel="last"')
    assert next_page_url(response) == f"{REPOS}?page=2"


@test("No Link header means no next page")
def _():
    assert next_page_url(page()) is None


@test("Only prev and last links means no next page")
def _():
    assert next_page_url(page(f'<{REPOS}?page=4>; rel="prev", <{REPOS}?page=5>; rel="last"')) is None


@test("A relative URL is made absolute")
def _():
    response = page('</orgs/acme/repos?page=3>; rel="next"', url=f"{REPOS}?page=2")
    assert next_page_url(response) == f"{REPOS}?page=3"


@hidden("Keeps the whole query string, and works whatever the order of the links")
def _():
    link = f'<{REPOS}?page=1&per_page=30>; rel="first", <{REPOS}?page=3&per_page=30&type=all>; rel="next"'
    assert next_page_url(page(link)) == f"{REPOS}?page=3&per_page=30&type=all"
