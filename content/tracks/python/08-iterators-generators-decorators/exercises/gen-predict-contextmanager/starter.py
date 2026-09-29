from contextlib import contextmanager


@contextmanager
def step(name):
    print(f"start {name}")
    try:
        yield name.upper()
    except KeyError as error:
        print(f"{name}: skipped missing field {error}")
    finally:
        print(f"end {name}")


with step("load") as label:
    print("inside", label)

with step("parse"):
    row = {"id": "A1"}
    print("total is", row["total"])
    print("never printed")

try:
    with step("save"):
        raise ValueError("disk full")
except ValueError as error:
    print("import failed:", error)

print("done")
