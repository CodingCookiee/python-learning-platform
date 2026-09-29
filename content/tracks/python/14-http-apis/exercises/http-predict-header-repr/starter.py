import httpx

request = httpx.Request(
    "GET",
    "https://api.payments.example/v1/charges",
    headers={"Authorization": "Bearer sk_live_51Hx", "X-API-Key": "key_8f2a", "Accept": "application/json"},
)
print(request.headers)
print(request.headers["AUTHORIZATION"])
print(dict(request.headers)["authorization"])
print(request.headers.get("x-api-key"), request.headers.get("X-Api-Secret"))

leaky = httpx.Request("GET", "https://api.weather.example/v1/forecast", params={"city": "Oslo", "api_key": "wk_live_9f2c"})
try:
    httpx.Response(401, request=leaky).raise_for_status()
except httpx.HTTPStatusError as error:
    print(str(error).splitlines()[0])
