from itertools import islice

import httpx

from plp import hidden, raises, test
from solution import iter_repos

NAMES = ["billing", "crm-sync", "docs", "infra", "mobile", "web", "website-old"]


class FakeGitHub:
    """Serves /orgs/<org>/repos, then continues on /organizations/<id>/repos, like the real thing."""

    def __init__(self, names=NAMES, org_id=4412):
        self.repos = [{"name": name, "full_name": f"acme/{name}", "private": False} for name in names]
        self.org_id = org_id
        self.urls = []

    def __call__(self, request):
        self.urls.append(str(request.url))
        if request.url.path == "/orgs/ghost/repos":
            return httpx.Response(404, json={"message": "Not Found"})
        per_page = int(request.url.params.get("per_page", 30))
        page = int(request.url.params.get("page", 1))
        chunk = self.repos[(page - 1) * per_page : page * per_page]
        last = max(1, -(-len(self.repos) // per_page))
        base = f"https://api.github.com/organizations/{self.org_id}/repos?per_page={per_page}"
        links = []
        if page > 1:
            links.append(f'<{base}&page={page - 1}>; rel="prev"')
        if page < last:
            links.append(f'<{base}&page={page + 1}>; rel="next"')
            links.append(f'<{base}&page={last}>; rel="last"')
        headers = {"Link": ", ".join(links)} if links else {}
        return httpx.Response(200, json=chunk, headers=headers)

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.github.com", timeout=10)


@test("Yields all seven repositories from three pages")
def _():
    github = FakeGitHub()
    assert [repo["name"] for repo in iter_repos(github.client(), "acme", per_page=3)] == NAMES
    assert len(github.urls) == 3


@test("Follows the next links exactly as given")
def _():
    github = FakeGitHub()
    list(iter_repos(github.client(), "acme", per_page=3))
    assert github.urls == [
        "https://api.github.com/orgs/acme/repos?per_page=3",
        "https://api.github.com/organizations/4412/repos?per_page=3&page=2",
        "https://api.github.com/organizations/4412/repos?per_page=3&page=3",
    ]


@test("One page with no Link header is one request")
def _():
    github = FakeGitHub()
    assert len(list(iter_repos(github.client(), "acme"))) == 7
    assert github.urls == ["https://api.github.com/orgs/acme/repos?per_page=100"]


@hidden("Fetches pages only when they're needed")
def _():
    github = FakeGitHub()
    assert [repo["name"] for repo in islice(iter_repos(github.client(), "acme", per_page=2), 3)] == NAMES[:3]
    assert len(github.urls) == 2


@hidden("A missing organisation raises")
def _():
    raises(httpx.HTTPStatusError, list, iter_repos(FakeGitHub().client(), "ghost"))
