from functools import wraps


def tag(label):
    print(f"make {label}")

    def decorate(func):
        print(f"wrap {label}")

        @wraps(func)
        def wrapper(*args):
            print(f"enter {label}")
            result = func(*args)
            print(f"exit {label}")
            return f"{label}({result})"

        return wrapper

    return decorate


def shout(func):
    print("wrap shout")

    def wrapper(*args):
        return func(*args).upper()

    return wrapper


@tag("auth")
@shout
@tag("audit")
def export_report(name):
    print(f"exporting {name}")
    return name


print("---")
print(export_report("q3"))
print(export_report.__name__)
