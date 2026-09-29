import httpx


def shop(request):
    if request.url.path == "/v2/orders/1042":
        return httpx.Response(200, json={"id": 1042, "status": "shipped"})
    return httpx.Response(404, json={"error": "order not found"})


client = httpx.Client(transport=httpx.MockTransport(shop), base_url="https://api.shop.example/v2", timeout=10)
found = client.get("/orders/1042")
missing = client.get("/orders/9999")
print(found.status_code, found.json()["status"])
print(missing.status_code, missing.is_success, missing.json())

try:
    missing.raise_for_status()
    print("no exception")
except httpx.HTTPStatusError as error:
    print(type(error).__name__, error.response.status_code)
    caught = error

print(found.raise_for_status() is found)
print(isinstance(caught, httpx.HTTPError), isinstance(caught, httpx.RequestError))
