import httpx

search = httpx.Request(
    "GET",
    "https://api.crm.example/v1/companies",
    params={"name": "Marks & Spencer", "tags": ["retail", "uk"], "limit": 20},
)
print(search.url.query.decode())
print(search.url.params["name"])
print(search.url.params.get_list("tags"))

next_page = httpx.Request("GET", "https://api.crm.example/v1/companies?limit=5", params={"page": 2})
print(next_page.url)

create = httpx.Request("POST", "https://api.crm.example/v1/companies", json={"name": "Kiln Cafe", "employees": 12})
print(create.method, create.headers["content-type"])
print(create.content.decode())
