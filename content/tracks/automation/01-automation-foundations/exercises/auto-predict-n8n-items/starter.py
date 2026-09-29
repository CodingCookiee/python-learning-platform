incoming = [
    {"json": {"email": "AMIRA@EXAMPLE.COM", "tags": ["web"]}},
    {"json": {"email": "tom@example.com", "tags": ["web"]}},
]

cleaned = []
for item in incoming:
    data = item["json"]
    data["email"] = data["email"].lower()
    data["tags"].append("clean")
    cleaned.append({"json": data})

print(incoming[0]["json"]["email"])
print(len(cleaned[1]["json"]["tags"]))
print(cleaned[0]["json"] is incoming[0]["json"])

copies = [{"json": dict(item["json"])} for item in incoming]
copies[0]["json"]["email"] = "vip@example.com"
copies[0]["json"]["tags"].append("vip")

print(incoming[0]["json"]["email"])
print(incoming[0]["json"]["tags"])
