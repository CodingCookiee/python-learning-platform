def describe(first, *rest, **options):
    print(first, rest, options)


describe("ada")
describe("ada", "grace", "linus")
describe(*["mo", "sam"], role="admin")

settings = {"role": "viewer", "team": "ops"}
describe("kim", **settings)

parts = ("north", "south")
describe(parts)
