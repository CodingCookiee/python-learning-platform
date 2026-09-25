from collections import defaultdict

visits = defaultdict(int)
for page in ["/home", "/cart", "/home"]:
    visits[page] += 1

print(visits["/home"])
print(visits.get("/about", 0))
print(len(visits))
print(visits["/checkout"])
print("/checkout" in visits, "/about" in visits)
print(len(visits))
